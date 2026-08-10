// screens/admin/invoice/ManualInvoiceDetail.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Animated, Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system';
import { LightTheme, DarkTheme } from '../../../styles/Theme';
import ScreenWrapper from '../../../components/common/ScreenWrapper';
import axiosClient from '../../../services/axiosClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeNum = (v) => {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object') {
        const raw = v.$numberDecimal ?? v.$numberDouble ?? v.$numberInt ?? v.value;
        return raw != null ? parseFloat(raw) : 0;
    }
    return parseFloat(v) || 0;
};

const fmt = (n) =>
    `₹${safeNum(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    paid: { color: '#2ECC9A', bg: '#2ECC9A18', label: 'Paid', icon: 'checkmark-circle' },
    unpaid: { color: '#FF6B6B', bg: '#FF6B6B18', label: 'Unpaid', icon: 'time-outline' },
    draft: { color: '#e2a731', bg: '#e2a73118', label: 'Draft', icon: 'time-outline' },
    cancelled: { color: '#FF6B6B', bg: '#FF6B6B18', label: 'Cancelled', icon: 'close-circle' },
};

// ─── Section card wrapper ──────────────────────────────────────────────────────
const SectionCard = ({ children, C, isDark, style }) => (
    <View
        style={[
            detailS.sectionCard,
            {
                backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
            },
            style,
        ]}
    >
        {children}
    </View>
);

// ─── Section label ─────────────────────────────────────────────────────────────
const SectionLabel = ({ label, icon, C }) => (
    <View style={detailS.sectionLabelRow}>
        {icon && <MaterialCommunityIcons name={icon} size={13} color={C.primary} />}
        <Text style={[detailS.sectionLabel, { color: C.textMuted }]}>{label}</Text>
    </View>
);

// ─── Info row ─────────────────────────────────────────────────────────────────
const InfoRow = ({ icon, value, C }) => {
    if (!value) return null;
    return (
        <View style={detailS.infoRow}>
            <Ionicons name={icon} size={13} color={C.textMuted} />
            <Text style={[detailS.infoText, { color: C.textSecondary }]}>{value}</Text>
        </View>
    );
};

// ─── Amount row in payment breakdown ─────────────────────────────────────────
const AmtRow = ({ label, value, positive, grand, muted, C }) => (
    <View style={[detailS.amtRow, grand && detailS.amtRowGrand]}>
        <Text
            style={[
                detailS.amtLabel,
                { color: grand ? C.textPrimary : muted ? C.textMuted : C.textSecondary },
                grand && { fontWeight: '800', fontSize: 14 },
            ]}
        >
            {label}
        </Text>
        <Text
            style={[
                detailS.amtValue,
                {
                    color: positive ? '#2ECC9A' : grand ? '#2ECC9A' : muted ? C.textMuted : C.textPrimary,
                },
                grand && { fontWeight: '800', fontSize: 16 },
            ]}
        >
            {value}
        </Text>
    </View>
);

// ─── Line item row ────────────────────────────────────────────────────────────
const LineItem = ({ item, type, C, isDark, isLast }) => {
    const originalPrice = safeNum(item?.price);
    const effectivePrice = safeNum(item?.effectivePrice) || originalPrice;
    const qty = safeNum(item?.quantity) || 1;
    const lineTotal = effectivePrice * qty;
    const hasDiscount = effectivePrice < originalPrice;
    const saving = (originalPrice - effectivePrice) * qty;
    const name = type === 'service' ? item?.serviceName : item?.partName;

    return (
        <View style={[detailS.lineItem, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={{ flex: 1, gap: 3 }}>
                <Text style={[detailS.itemName, { color: C.textPrimary }]}>{name}</Text>
                <View style={detailS.itemMeta}>
                    <Text style={[detailS.itemMetaTxt, { color: C.textMuted }]}>Qty: {qty}</Text>
                    {hasDiscount && (
                        <Text style={[detailS.itemMetaTxt, { color: C.textMuted, textDecorationLine: 'line-through' }]}>
                            {fmt(originalPrice)}/unit
                        </Text>
                    )}
                    <Text style={[detailS.itemMetaTxt, { color: hasDiscount ? '#2ECC9A' : C.textMuted }]}>
                        {fmt(effectivePrice)}/unit
                    </Text>
                </View>
            </View>
            <View style={detailS.itemPriceCol}>
                {hasDiscount && qty > 1 && (
                    <Text style={[detailS.strikePrice, { color: C.textMuted }]}>
                        {fmt(originalPrice * qty)}
                    </Text>
                )}
                <Text style={[detailS.itemTotal, { color: C.textPrimary }]}>{fmt(lineTotal)}</Text>
                {hasDiscount && (
                    <View style={detailS.savingBadge}>
                        <Text style={detailS.savingBadgeText}>-{fmt(saving)}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ManualInvoiceDetail({ route, navigation }) {
    const { invoiceId } = route.params || {};
    const mode = useSelector((s) => s.theme?.mode || 'light');
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sharing, setSharing] = useState(false);

    // Entrance animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const fetchInvoice = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/api/manual-invoices/${invoiceId}`);
            setInvoice(res.data?.data || res.data);
            Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to load invoice');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    }, [invoiceId]);

    useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

    // ── Derived financials ─────────────────────────────────────────────────────
    const t = invoice?.total ?? {};
    const pd = invoice?.paymentDetails ?? {};

    const subTotal = safeNum(t.subTotal || t.baseAmount);
    const billDiscount = safeNum(t.discount);
    const referralDiscount = safeNum(t.referralDiscount);
    const walletUsed = safeNum(t.walletAmountUsed ?? pd.walletAmountUsed);
    const sgst = safeNum(t.sgst);
    const cgst = safeNum(t.cgst);
    const sgstRate = safeNum(t.sgstRate);
    const cgstRate = safeNum(t.cgstRate);
    const preWalletTotal = safeNum(t.total ?? t.finalPayable);
    const finalPayable = safeNum(t.finalPayable);
    const totalSettled = safeNum(t.totalAmountPaid ?? pd.totalSettled ?? pd.amountPaid);
    const gatewayAmount = safeNum(pd.amountPaid);
    const isCash = pd.method === 'cash';
    const isFullWallet = pd.method === 'referral';


    const effectivePrice = (item) => safeNum(item?.effectivePrice) || safeNum(item?.price);
    const hasItemDiscount = (item) => {
        const original = safeNum(item?.price);
        const eff = safeNum(item?.effectivePrice);
        return eff > 0 && eff < original;
    };
    // ── Total item savings ─────────────────────────────────────────────────────
    const itemSavings = useMemo(() => {
        if (!invoice) return 0;
        const allItems = [...(invoice.serviceProvided || []), ...(invoice.partsUsed || [])];
        return allItems.reduce((acc, item) => {
            if (hasItemDiscount(item)) {
                const qty = safeNum(item.quantity) || 1;
                const original = safeNum(item.price);
                const eff = safeNum(item.effectivePrice);
                acc += (original - eff) * qty;
            }
            return acc;
        }, 0);
    }, [invoice]);

    // ── PDF generation ──────────────────────────────────────────────────────────
    const buildHTML = useCallback(() => {
        if (!invoice) return '';
        const hasBusiness = !!invoice.businessDetails?.gstin;
        const title = hasBusiness ? 'TAX INVOICE' : 'INVOICE';
        const b = invoice.businessDetails || {};
        const c = invoice.customerDetails || {};
        const v = invoice.vehicleDetails || {};

        const renderItems = (items, type) => {
            if (!items?.length) return '';
            return items.map((item) => {
                const name = type === 'service' ? item.serviceName : item.partName;
                const qty = safeNum(item.quantity) || 1;
                const unitPrice = safeNum(item.price);
                const effPrice = effectivePrice(item);
                const discounted = effPrice < unitPrice;
                return `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${qty}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${fmt(unitPrice)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${discounted ? '-' + fmt((unitPrice - effPrice) * qty) : '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${fmt(effPrice * qty)}</td>
        </tr>`;
            }).join('');
        };

        return `
        <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
            .company-name { font-size: 24px; font-weight: bold; color: #222; margin-bottom: 5px; }
            .company-info { font-size: 14px; color: #555; line-height: 1.5; }
            .invoice-title { font-size: 28px; font-weight: bold; color: #e2a731; text-align: right; letter-spacing: 1px; }
            .meta-info { text-align: right; font-size: 14px; margin-top: 10px; line-height: 1.5; }
            .details-section { display: flex; justify-content: space-between; margin-bottom: 30px; border-top: 2px solid #e2a731; padding-top: 20px; }
            .billed-to { width: 45%; }
            .vehicle-info { width: 45%; text-align: right; }
            .section-title { font-size: 12px; font-weight: bold; color: #888; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }
            .detail-text { font-size: 14px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f8f9fa; padding: 12px 10px; text-align: left; font-size: 13px; color: #555; text-transform: uppercase; border-bottom: 2px solid #ddd; }
            th.right { text-align: right; } th.center { text-align: center; }
            .totals { width: 40%; float: right; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
            .total-row.grand-total { font-size: 18px; font-weight: bold; color: #e2a731; border-top: 2px solid #e2a731; padding-top: 15px; margin-top: 10px; }
            .clear { clear: both; }
            .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; }
        </style></head><body>
        <div class="header">
            <div class="company-info">
                <div class="company-name">Repairo Moto</div>
                <div>5c/12 Manna Singh Lane, Vivekanand Marg</div>
                <div>North S.K Puri, Boring Road, Patna - 800013</div>
                <div>Phone: +91 9229207021 | Email: repairomoto@gmail.com</div>
                <div>GSTIN: 10AAXCS3327A1ZO</div>
            </div>
            <div>
                <div class="invoice-title">${title}</div>
                <div class="meta-info">
                    <div><strong>Invoice No:</strong> #${invoice.invoiceNumber}</div>
                    <div><strong>Date:</strong> ${fmtDate(invoice.invoiceDate)}</div>
                    ${pd.razorpayPaymentId ? `<div><strong>Txn ID:</strong> ${pd.razorpayPaymentId}</div>` : ''}
                </div>
            </div>
        </div>
        <div class="details-section">
            <div class="billed-to">
                <div class="section-title">Billed To</div>
                ${hasBusiness
                ? `<div class="detail-text"><strong>${b.businessName || ''}</strong><br>GSTIN: ${b.gstin || ''}<br>${b.businessAddress || ''}<br>${b.businessCity || ''}, ${b.businessState || ''} - ${b.businessPincode || ''}</div>`
                : `<div class="detail-text"><strong>${c.name || 'Customer'}</strong><br>${c.email ? c.email + '<br>' : ''}${c.contactNo ? c.contactNo + '<br>' : ''}${c.address ? c.address + '<br>' : ''}${c.city || ''}</div>`
            }
            </div>
            <div class="vehicle-info">
                <div class="section-title">Vehicle Details</div>
                <div class="detail-text">
                    <strong>${v.brand || ''} ${v.model || ''} ${v.modelName ? '(' + v.modelName + ')' : ''}</strong><br>
                    ${v.cc ? v.cc + ' cc<br>' : ''}${v.bs || ''}
                </div>
            </div>
        </div>
        <table>
            <thead><tr>
                <th>Description</th><th class="center">Qty</th>
                <th class="right">Unit Price</th><th class="right">Discount</th><th class="right">Amount</th>
            </tr></thead>
            <tbody>
                ${renderItems(invoice.serviceProvided, 'service')}
                ${renderItems(invoice.partsUsed, 'part')}
            </tbody>
        </table>
        <div class="totals">
            ${subTotal > 0 ? `<div class="total-row"><span>Subtotal</span><span>${fmt(subTotal)}</span></div>` : ''}
            ${billDiscount > 0 ? `<div class="total-row"><span>Bill Discount</span><span style="color:#e2a731;">-${fmt(billDiscount)}</span></div>` : ''}
            ${referralDiscount > 0 ? `<div class="total-row"><span>Referral Discount</span><span style="color:#e2a731;">-${fmt(referralDiscount)}</span></div>` : ''}
            ${sgst > 0 ? `<div class="total-row"><span>SGST (${sgstRate}%)</span><span>${fmt(sgst)}</span></div>` : ''}
            ${cgst > 0 ? `<div class="total-row"><span>CGST (${cgstRate}%)</span><span>${fmt(cgst)}</span></div>` : ''}
            ${walletUsed > 0 ? `<div class="total-row"><span>Wallet Used</span><span style="color:#e2a731;">-${fmt(walletUsed)}</span></div>` : ''}
            <div class="total-row grand-total"><span>Total Paid</span><span>${fmt(totalSettled || finalPayable)}</span></div>
        </div>
        <div class="clear"></div>
        <div class="footer">Thank you for choosing Repairo Moto!<br>This is a computer-generated invoice.</div>
        </body></html>`;
    }, [invoice]);

    const handleShare = useCallback(async () => {
        if (!invoice) return;
        setSharing(true);
        try {
            const html = buildHTML();
            const { uri } = await Print.printToFileAsync({ html, base64: false });
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `Invoice #${invoice.invoiceNumber}`,
                UTI: 'com.adobe.pdf',
            });
        } catch (err) {
            Alert.alert('Error', err?.message || 'Could not share invoice');
        } finally {
            setSharing(false);
        }
    }, [invoice, buildHTML]);

    const handleEdit = useCallback(() => {
        navigation.navigate('AdminEditManualInvoice', { invoiceId, invoice });
    }, [invoiceId, invoice]);

    if (loading) {
        return (
            <ScreenWrapper title="Invoice Detail">
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={C.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!invoice) return null;

    const statusCfg = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
    const customer = invoice.customerDetails || {};
    const vehicle = invoice.vehicleDetails || {};
    const business = invoice.businessDetails || {};
    const hasBusiness = !!business.gstin;

    return (
        <ScreenWrapper
            title="Invoice Detail"
            noPadding
            rightSlot={
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {/* Edit */}
                    <TouchableOpacity
                        onPress={handleEdit}
                        style={[
                            topBtnS.btn,
                            { backgroundColor: isDark ? C.surfaceHigh : C.surfaceLow, borderColor: C.border },
                        ]}
                        activeOpacity={0.75}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                        <Ionicons name="create-outline" size={17} color={C.primary} />
                    </TouchableOpacity>
                    {/* Share */}
                    <TouchableOpacity
                        onPress={handleShare}
                        disabled={sharing}
                        style={[topBtnS.btn, { backgroundColor: C.primary }]}
                        activeOpacity={0.82}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                        {sharing
                            ? <ActivityIndicator size="small" color="#1a1a1a" />
                            : <Ionicons name="share-social-outline" size={17} color="#1a1a1a" />
                        }
                    </TouchableOpacity>
                </View>
            }
        >
            <Animated.ScrollView
                style={{ opacity: fadeAnim }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={detailS.scroll}
            >
                {/* ── Hero card: Invoice # + status ─────────────────────────── */}
                <SectionCard C={C} isDark={isDark} style={detailS.heroCard}>
                    <View style={detailS.heroTop}>
                        <View>
                            <Text style={[detailS.invNum, { color: C.primary }]}>
                                #{invoice.invoiceNumber}
                            </Text>
                            <Text style={[detailS.invDate, { color: C.textMuted }]}>
                                {fmtDate(invoice.invoiceDate)}
                            </Text>
                        </View>
                        <View style={[detailS.statusBadgeLarge, { backgroundColor: statusCfg.bg }]}>
                            <Ionicons name={statusCfg.icon} size={14} color={statusCfg.color} />
                            <Text style={[detailS.statusLabelLarge, { color: statusCfg.color }]}>
                                {statusCfg.label}
                            </Text>
                        </View>
                    </View>

                    {/* Amount highlight */}
                    <View style={[detailS.amountHero, { backgroundColor: isDark ? '#2A2318' : '#FFF8EC', borderColor: C.border }]}>
                        <Text style={[detailS.amountLabel, { color: C.textMuted }]}>
                            {invoice.status === 'unpaid' ? 'AMOUNT DUE' : 'TOTAL PAID'}
                        </Text>
                        <Text style={[detailS.amountValue, { color: invoice.status === 'unpaid' ? '#FF6B6B' : '#2ECC9A' }]}>
                            {fmt(totalSettled || finalPayable)}
                        </Text>
                    </View>

                    {/* Transaction meta */}
                    <View style={detailS.metaGrid}>
                        {pd.method && (
                            <View style={detailS.metaItem}>
                                <Ionicons name="card-outline" size={12} color={C.textMuted} />
                                <Text style={[detailS.metaTxt, { color: C.textMuted }]}>
                                    {pd.method.toUpperCase()}
                                </Text>
                            </View>
                        )}
                        {pd.razorpayPaymentId && (
                            <View style={detailS.metaItem}>
                                <Ionicons name="receipt-outline" size={12} color={C.textMuted} />
                                <Text style={[detailS.metaTxt, { color: C.textMuted }]} numberOfLines={1}>
                                    {pd.razorpayPaymentId}
                                </Text>
                            </View>
                        )}
                        {pd.paymentDate && (
                            <View style={detailS.metaItem}>
                                <Ionicons name="checkmark-circle-outline" size={12} color={C.textMuted} />
                                <Text style={[detailS.metaTxt, { color: C.textMuted }]}>
                                    Paid {fmtDate(pd.paymentDate)}
                                </Text>
                            </View>
                        )}
                        {hasBusiness && (
                            <View style={[detailS.metaItem, { backgroundColor: C.surfaceHighest, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }]}>
                                <Text style={{ fontSize: 9, fontWeight: '900', color: C.primary, letterSpacing: 0.5 }}>GST</Text>
                                <Text style={[detailS.metaTxt, { color: C.primary }]}>Tax Invoice</Text>
                            </View>
                        )}
                    </View>
                </SectionCard>

                {/* ── Customer / Business ────────────────────────────────────── */}
                <SectionCard C={C} isDark={isDark}>
                    <SectionLabel label="BILLED TO" icon="account-outline" C={C} />
                    {hasBusiness ? (
                        <>
                            <Text style={[detailS.primaryName, { color: C.textPrimary }]}>
                                {business.businessName}
                            </Text>
                            <InfoRow icon="shield-outline" value={`GSTIN: ${business.gstin}`} C={C} />
                            <InfoRow icon="location-outline" value={[business.businessAddress, business.businessCity, business.businessState, business.businessPincode].filter(Boolean).join(', ')} C={C} />
                        </>
                    ) : (
                        <>
                            <Text style={[detailS.primaryName, { color: C.textPrimary }]}>
                                {customer.name || 'Unknown Customer'}
                            </Text>
                            <InfoRow icon="mail-outline" value={customer.email} C={C} />
                            <InfoRow icon="call-outline" value={customer.contactNo} C={C} />
                            <InfoRow icon="location-outline" value={[customer.address, customer.city].filter(Boolean).join(', ')} C={C} />
                        </>
                    )}
                </SectionCard>

                {/* ── Vehicle ────────────────────────────────────────────────── */}
                <SectionCard C={C} isDark={isDark}>
                    <SectionLabel label="VEHICLE" icon="motorbike" C={C} />
                    <Text style={[detailS.primaryName, { color: C.textPrimary }]}>
                        {[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}
                        {vehicle.modelName ? ` (${vehicle.modelName})` : ''}
                    </Text>
                    <View style={detailS.tagRow}>
                        {vehicle.cc && (
                            <View style={[detailS.tag, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                                <Text style={[detailS.tagText, { color: C.textSecondary }]}>{vehicle.cc} cc</Text>
                            </View>
                        )}
                        {vehicle.bs && (
                            <View style={[detailS.tag, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                                <Text style={[detailS.tagText, { color: C.textSecondary }]}>{vehicle.bs}</Text>
                            </View>
                        )}
                    </View>
                </SectionCard>

                {/* ── Services ───────────────────────────────────────────────── */}
                {invoice.serviceProvided?.length > 0 && (
                    <SectionCard C={C} isDark={isDark}>
                        <SectionLabel label="SERVICES" icon="wrench" C={C} />
                        <View style={[detailS.itemsBox, { backgroundColor: isDark ? '#141210' : '#F8F5EF', borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }]}>
                            {invoice.serviceProvided.map((s, i) => (
                                <LineItem
                                    key={i}
                                    item={s}
                                    type="service"
                                    C={C}
                                    isDark={isDark}
                                    isLast={i === invoice.serviceProvided.length - 1}
                                />
                            ))}
                        </View>
                    </SectionCard>
                )}

                {/* ── Parts ──────────────────────────────────────────────────── */}
                {invoice.partsUsed?.length > 0 && (
                    <SectionCard C={C} isDark={isDark}>
                        <SectionLabel label="PARTS USED" icon="cog" C={C} />
                        <View style={[detailS.itemsBox, { backgroundColor: isDark ? '#141210' : '#F8F5EF', borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }]}>
                            {invoice.partsUsed.map((p, i) => (
                                <LineItem
                                    key={i}
                                    item={p}
                                    type="part"
                                    C={C}
                                    isDark={isDark}
                                    isLast={i === invoice.partsUsed.length - 1}
                                />
                            ))}
                        </View>
                    </SectionCard>
                )}

                {/* ── Payment Breakdown ──────────────────────────────────────── */}
                <SectionCard C={C} isDark={isDark}>
                    <SectionLabel label="PAYMENT BREAKDOWN" icon="cash-multiple" C={C} />

                    {/* Payment Status Badge */}
                    <View style={{
                        backgroundColor: statusCfg.bg,
                        borderColor: statusCfg.color,
                        borderWidth: 1.5,
                        borderRadius: 10,
                        padding: 10,
                        marginBottom: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <Ionicons name={statusCfg.icon} size={16} color={statusCfg.color} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5 }}>STATUS</Text>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: statusCfg.color }}>
                                {statusCfg.label}
                            </Text>
                        </View>
                    </View>

                    {subTotal > 0 && <AmtRow label="Subtotal (Services + Parts)" value={fmt(subTotal)} C={C} />}
                    {itemSavings > 0 && <AmtRow label="Item Discounts" value={`-${fmt(itemSavings)}`} positive C={C} />}
                    {billDiscount > 0 && (
                        <AmtRow
                            label={`Bill Discount${t.discountType ? ` (${t.discountType})` : ''}`}
                            value={`-${fmt(billDiscount)}`}
                            positive
                            C={C}
                        />
                    )}
                    {referralDiscount > 0 && (
                        <AmtRow label="Referral Discount" value={`-${fmt(referralDiscount)}`} positive C={C} />
                    )}
                    {sgst > 0 && <AmtRow label={`SGST (${sgstRate}%)`} value={fmt(sgst)} muted C={C} />}
                    {cgst > 0 && <AmtRow label={`CGST (${cgstRate}%)`} value={fmt(cgst)} muted C={C} />}

                    <View style={[detailS.divider, { backgroundColor: C.border }]} />

                    {walletUsed > 0 && (
                        <>
                            <AmtRow label="Pre-wallet Total" value={fmt(preWalletTotal)} C={C} />
                            <AmtRow label="🎁 Referral Wallet Used" value={`-${fmt(walletUsed)}`} positive C={C} />
                            <View style={[detailS.divider, { backgroundColor: C.border }]} />
                        </>
                    )}

                    {/* Grand total row or Unpaid message */}
                    {invoice?.status === 'unpaid' ? (
                        <View style={{
                            backgroundColor: (C.error ?? '#FF6B6B') + '15',
                            borderColor: (C.error ?? '#FF6B6B'),
                            borderWidth: 1.5,
                            borderRadius: 12,
                            padding: 14,
                            marginTop: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                        }}>
                            <Ionicons name="time-outline" size={20} color={C.error ?? '#FF6B6B'} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: C.error ?? '#FF6B6B', marginBottom: 3 }}>
                                    PAYMENT PENDING
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: C.error ?? '#FF6B6B' }}>
                                    Amount Due: {fmt(finalPayable)}
                                </Text>
                                <Text style={{ fontSize: 11, fontWeight: '500', color: (C.error ?? '#FF6B6B'), marginTop: 3, opacity: 0.8 }}>
                                    Update payment details when received
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={[detailS.grandTotalBox, { backgroundColor: isDark ? '#2A2318' : '#FFF8EC', borderRadius: 12, padding: 12, marginTop: 8 }]}>
                            <View>
                                <Text style={[detailS.grandTotalLabel, { color: C.textMuted }]}>TOTAL PAID</Text>
                                {walletUsed > 0 && !isCash && (
                                    <Text style={[detailS.walletNote, { color: C.textMuted }]}>
                                        {isFullWallet
                                            ? 'Fully covered by wallet'
                                            : `Gateway: ${fmt(gatewayAmount)} + Wallet: ${fmt(walletUsed)}`}
                                    </Text>
                                )}
                                {isCash && (
                                    <Text style={[detailS.walletNote, { color: C.textMuted }]}>Cash on Delivery</Text>
                                )}
                            </View>
                            <Text style={[detailS.grandTotalValue, { color: '#2ECC9A' }]}>
                                {fmt(totalSettled || finalPayable)}
                            </Text>
                        </View>
                    )}
                </SectionCard>

                {/* ── Edit button at bottom ──────────────────────────────────── */}
                <TouchableOpacity
                    onPress={handleEdit}
                    style={[detailS.editFullBtn, { backgroundColor: isDark ? C.surfaceHigh : C.surfaceLow, borderColor: C.border }]}
                    activeOpacity={0.78}
                >
                    <Ionicons name="create-outline" size={18} color={C.primary} />
                    <Text style={[detailS.editFullBtnText, { color: C.primary }]}>Edit Invoice</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </Animated.ScrollView>
        </ScreenWrapper>
    );
}

const topBtnS = StyleSheet.create({
    btn: {
        width: 34, height: 34, borderRadius: 10, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
    },
});

const detailS = StyleSheet.create({
    scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

    sectionCard: {
        borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12,
    },
    heroCard: { marginBottom: 12 },
    heroTop: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 14,
    },
    invNum: { fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
    invDate: { fontSize: 12, marginTop: 3 },

    statusBadgeLarge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    },
    statusLabelLarge: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

    amountHero: {
        borderRadius: 12, borderWidth: 1,
        paddingHorizontal: 14, paddingVertical: 12,
        marginBottom: 12,
    },
    amountLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
    amountValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },

    metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaTxt: { fontSize: 11 },

    sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },

    primaryName: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
    infoText: { fontSize: 13, flex: 1, lineHeight: 18 },

    tagRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
    tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    tagText: { fontSize: 12, fontWeight: '600' },

    itemsBox: {
        borderRadius: 12, borderWidth: 1, overflow: 'hidden',
    },
    lineItem: { flexDirection: 'row', padding: 12, alignItems: 'flex-start' },
    itemName: { fontSize: 14, fontWeight: '700' },
    itemMeta: { flexDirection: 'row', gap: 8, marginTop: 3, flexWrap: 'wrap' },
    itemMetaTxt: { fontSize: 11 },
    itemPriceCol: { alignItems: 'flex-end', gap: 3, minWidth: 70 },
    strikePrice: { fontSize: 11, textDecorationLine: 'line-through' },
    itemTotal: { fontSize: 14, fontWeight: '800' },
    savingBadge: {
        backgroundColor: '#2ECC9A22', borderRadius: 6,
        paddingHorizontal: 5, paddingVertical: 2,
    },
    savingBadgeText: { fontSize: 10, fontWeight: '700', color: '#2ECC9A' },

    amtRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingVertical: 6,
    },
    amtRowGrand: { paddingVertical: 8 },
    amtLabel: { fontSize: 13, color: '#6B5E4A' },
    amtValue: { fontSize: 13, fontWeight: '700' },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
    grandTotalBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    grandTotalLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 3 },
    grandTotalValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
    walletNote: { fontSize: 11, marginTop: 2 },

    editFullBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1, marginTop: 4,
    },
    editFullBtnText: { fontSize: 15, fontWeight: '800' },
});