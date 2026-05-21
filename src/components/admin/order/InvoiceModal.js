import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';




export default function InvoiceModal({ visible, invoice, onClose, theme, loading }) {
    const isDark = theme.mode === 'dark';
    const C = theme.colors;
    if (!visible) return null;

    // ── Helpers ───────────────────────────────────────────────────────────────
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

    const t = invoice?.total ?? {};
    const pd = invoice?.paymentDetails ?? {};

    // ── Discount waterfall values ─────────────────────────────────────────────
    const subTotal = safeNum(t.subTotal || t.baseAmount);
    const billDiscount = safeNum(t.discount);
    const referralDiscount = safeNum(t.referralDiscount);   // admin applied on bill
    const walletUsed = safeNum(t.walletAmountUsed ?? pd.walletAmountUsed);
    const sgst = safeNum(t.sgst);
    const cgst = safeNum(t.cgst);
    const sgstRate = safeNum(t.sgstRate);
    const cgstRate = safeNum(t.cgstRate);
    const preWalletTotal = safeNum(t.total ?? t.finalPayable);
    const finalPayable = safeNum(t.finalPayable);
    const totalSettled = safeNum(t.totalAmountPaid ?? pd.totalSettled ?? pd.amountPaid);

    // Gateway amount (Razorpay charge only, excluding wallet)
    const gatewayAmount = safeNum(pd.amountPaid);
    const isCash = pd.method === 'cash';
    const isFullWallet = pd.method === 'referral';

    // ── Per-item discount helper ───────────────────────────────────────────────
    const hasItemDiscount = (item) =>
        safeNum(item.discountPrice) > 0 &&
        safeNum(item.discountPrice) < safeNum(item.price);

    const effectivePrice = (item) =>
        hasItemDiscount(item) ? safeNum(item.discountPrice) : safeNum(item.price);
    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    return (
        <Modal transparent visible={visible} animationType="slide" statusBarTranslucent>
            <View style={[invM.container, { backgroundColor: isDark ? '#0F0E0B' : '#F5F2EB' }]}>

                {/* ── Header ───────────────────────────────────────────────── */}
                <View style={[invM.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                    <Text style={[invM.headerTitle, { color: C.textPrimary }]}>Invoice</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="close" size={24} color={C.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* ── Loading / empty ───────────────────────────────────────── */}
                {loading ? (
                    <View style={invM.loadingWrap}>
                        <ActivityIndicator size="large" color={C.primary} />
                        <Text style={[invM.loadingText, { color: C.textMuted }]}>Loading invoice…</Text>
                    </View>
                ) : !invoice ? (
                    <View style={invM.loadingWrap}>
                        <MaterialCommunityIcons name="file-document-outline" size={48} color={C.textMuted} />
                        <Text style={[invM.loadingText, { color: C.textMuted }]}>Invoice not found</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={invM.scroll} showsVerticalScrollIndicator={false}>

                        {/* ── Invoice ID card ───────────────────────────────── */}
                        <View style={[invM.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                            <View style={invM.invIdRow}>
                                <View style={[invM.invBadge, { backgroundColor: isDark ? '#1A2A1A' : '#E6F7EC' }]}>
                                    <MaterialCommunityIcons name="check-circle" size={16} color="#2ECC9A" />
                                    <Text style={invM.invBadgeText}>PAID</Text>
                                </View>
                                <Text style={[invM.invNumber, { color: C.primary }]}>
                                    #{invoice.invoiceNumber}
                                </Text>
                            </View>
                            <View style={invM.metaRow}>
                                <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
                                <Text style={[invM.metaText, { color: C.textMuted }]}>
                                    Invoice: {formatDate(invoice.invoiceDate)}
                                </Text>
                            </View>
                            {pd.paymentDate && (
                                <View style={invM.metaRow}>
                                    <Ionicons name="card-outline" size={12} color={C.textMuted} />
                                    <Text style={[invM.metaText, { color: C.textMuted }]}>
                                        Paid: {formatDate(pd.paymentDate)}
                                        {pd.method ? ` · ${pd.method.toUpperCase()}` : ''}
                                    </Text>
                                </View>
                            )}
                            {pd.razorpayPaymentId && (
                                <View style={invM.metaRow}>
                                    <Ionicons name="receipt-outline" size={12} color={C.textMuted} />
                                    <Text style={[invM.metaText, { color: C.textMuted }]} numberOfLines={1}>
                                        Txn: {pd.razorpayPaymentId}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* ── Customer ──────────────────────────────────────── */}
                        <View style={[invM.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                            <Text style={[invM.sectionLabel, { color: C.textMuted }]}>CUSTOMER</Text>
                            <Text style={[invM.customerName, { color: C.textPrimary }]}>
                                {invoice.customerDetails?.name}
                            </Text>
                            {invoice.customerDetails?.email ? (
                                <Text style={[invM.customerDetail, { color: C.textSecondary }]}>
                                    {invoice.customerDetails.email}
                                </Text>
                            ) : null}
                            {invoice.customerDetails?.contactNo ? (
                                <Text style={[invM.customerDetail, { color: C.textSecondary }]}>
                                    {invoice.customerDetails.contactNo}
                                </Text>
                            ) : null}
                            {invoice.customerDetails?.city ? (
                                <Text style={[invM.customerDetail, { color: C.textSecondary }]}>
                                    {invoice.customerDetails.city}
                                </Text>
                            ) : null}
                        </View>

                        {/* ── Vehicle ───────────────────────────────────────── */}
                        <View style={[invM.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                            <Text style={[invM.sectionLabel, { color: C.textMuted }]}>VEHICLE</Text>
                            <Text style={[invM.customerName, { color: C.textPrimary }]}>
                                {invoice.vehicleDetails?.brand} {invoice.vehicleDetails?.model}
                                {invoice.vehicleDetails?.modelName ? ` ${invoice.vehicleDetails.modelName}` : ''}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                {invoice.vehicleDetails?.cc ? (
                                    <View style={[invM.tag, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                                        <Text style={[invM.tagText, { color: C.textSecondary }]}>
                                            {invoice.vehicleDetails.cc} cc
                                        </Text>
                                    </View>
                                ) : null}
                                {invoice.vehicleDetails?.bs ? (
                                    <View style={[invM.tag, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                                        <Text style={[invM.tagText, { color: C.textSecondary }]}>
                                            {invoice.vehicleDetails.bs}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>

                        {/* ── Services ──────────────────────────────────────── */}
                        {invoice.serviceProvided?.length > 0 && (
                            <View style={[invM.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                                <View style={invM.sectionHeaderRow}>
                                    <MaterialCommunityIcons name="wrench" size={13} color={C.primary} />
                                    <Text style={[invM.sectionLabel, { color: C.textMuted, marginBottom: 0 }]}>
                                        SERVICES
                                    </Text>
                                </View>
                                <View style={[invM.itemBox, { backgroundColor: isDark ? '#141210' : '#F8F5EF', borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }]}>
                                    {invoice.serviceProvided.map((s, i) => {
                                        const unitPrice = safeNum(s.price);
                                        const effPrice = effectivePrice(s);
                                        const qty = safeNum(s.quantity) || 1;
                                        const lineTotal = effPrice * qty;
                                        const discounted = hasItemDiscount(s);
                                        return (
                                            <View key={i} style={[
                                                invM.lineItem,
                                                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
                                            ]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[invM.itemName, { color: C.textPrimary }]}>
                                                        {s.serviceName}
                                                    </Text>
                                                    <View style={invM.itemMeta}>
                                                        <Text style={[invM.itemMetaText, { color: C.textMuted }]}>
                                                            Qty: {qty}
                                                        </Text>
                                                        {discounted && (
                                                            <Text style={[invM.itemMetaText, { color: C.textMuted, textDecorationLine: 'line-through' }]}>
                                                                {fmt(unitPrice)}/unit
                                                            </Text>
                                                        )}
                                                        <Text style={[invM.itemMetaText, { color: discounted ? '#2ECC9A' : C.textMuted }]}>
                                                            {fmt(effPrice)}/unit
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={invM.priceCol}>
                                                    {discounted && qty > 1 && (
                                                        <Text style={[invM.strikePrice, { color: C.textMuted }]}>
                                                            {fmt(unitPrice * qty)}
                                                        </Text>
                                                    )}
                                                    <Text style={[invM.itemPrice, { color: C.textPrimary }]}>
                                                        {fmt(lineTotal)}
                                                    </Text>
                                                    {discounted && (
                                                        <View style={invM.savingsBadge}>
                                                            <Text style={invM.savingsBadgeText}>
                                                                -{fmt((unitPrice - effPrice) * qty)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* ── Parts ─────────────────────────────────────────── */}
                        {invoice.partsUsed?.length > 0 && (
                            <View style={[invM.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                                <View style={invM.sectionHeaderRow}>
                                    <MaterialCommunityIcons name="cog" size={13} color={C.primary} />
                                    <Text style={[invM.sectionLabel, { color: C.textMuted, marginBottom: 0 }]}>
                                        PARTS USED
                                    </Text>
                                </View>
                                <View style={[invM.itemBox, { backgroundColor: isDark ? '#141210' : '#F8F5EF', borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }]}>
                                    {invoice.partsUsed.map((p, i) => {
                                        const unitPrice = safeNum(p.price);
                                        const effPrice = effectivePrice(p);
                                        const qty = safeNum(p.quantity) || 1;
                                        const lineTotal = effPrice * qty;
                                        const discounted = hasItemDiscount(p);
                                        return (
                                            <View key={i} style={[
                                                invM.lineItem,
                                                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
                                            ]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[invM.itemName, { color: C.textPrimary }]}>
                                                        {p.partName}
                                                    </Text>
                                                    <View style={invM.itemMeta}>
                                                        <Text style={[invM.itemMetaText, { color: C.textMuted }]}>
                                                            Qty: {qty}
                                                        </Text>
                                                        {discounted && (
                                                            <Text style={[invM.itemMetaText, { color: C.textMuted, textDecorationLine: 'line-through' }]}>
                                                                {fmt(unitPrice)}/unit
                                                            </Text>
                                                        )}
                                                        <Text style={[invM.itemMetaText, { color: discounted ? '#2ECC9A' : C.textMuted }]}>
                                                            {fmt(effPrice)}/unit
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={invM.priceCol}>
                                                    {discounted && qty > 1 && (
                                                        <Text style={[invM.strikePrice, { color: C.textMuted }]}>
                                                            {fmt(unitPrice * qty)}
                                                        </Text>
                                                    )}
                                                    <Text style={[invM.itemPrice, { color: C.textPrimary }]}>
                                                        {fmt(lineTotal)}
                                                    </Text>
                                                    {discounted && (
                                                        <View style={invM.savingsBadge}>
                                                            <Text style={invM.savingsBadgeText}>
                                                                -{fmt((unitPrice - effPrice) * qty)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* ── Payment Breakdown ──────────────────────────────── */}
                        <View style={[invM.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                            <Text style={[invM.sectionLabel, { color: C.textMuted }]}>PAYMENT BREAKDOWN</Text>

                            {/* Subtotal */}
                            {subTotal > 0 && (
                                <InvRow label="Subtotal (Services + Parts)" value={fmt(subTotal)} C={C} />
                            )}

                            {/* Per-item discount total — derived */}
                            {(() => {
                                const itemSavings = [
                                    ...(invoice.serviceProvided || []),
                                    ...(invoice.partsUsed || []),
                                ].reduce((acc, item) => {
                                    if (hasItemDiscount(item)) {
                                        const qty = safeNum(item.quantity) || 1;
                                        acc += (safeNum(item.price) - effectivePrice(item)) * qty;
                                    }
                                    return acc;
                                }, 0);
                                if (itemSavings <= 0) return null;
                                return (
                                    <InvRow
                                        label="Item Discounts"
                                        value={`-${fmt(itemSavings)}`}
                                        positive
                                        C={C}
                                    />
                                );
                            })()}

                            {/* Bill-level discount */}
                            {billDiscount > 0 && (
                                <InvRow
                                    label={`Bill Discount${invoice.total?.discountType ? ` (${invoice.total.discountType})` : ''}`}
                                    value={`-${fmt(billDiscount)}`}
                                    positive
                                    C={C}
                                />
                            )}

                            {/* Admin referral discount on bill */}
                            {referralDiscount > 0 && (
                                <InvRow
                                    label="Referral Discount (on bill)"
                                    value={`-${fmt(referralDiscount)}`}
                                    positive
                                    C={C}
                                />
                            )}

                            {/* Taxes */}
                            {sgst > 0 && (
                                <InvRow
                                    label={`SGST (${sgstRate}%)`}
                                    value={fmt(sgst)}
                                    muted
                                    C={C}
                                />
                            )}
                            {cgst > 0 && (
                                <InvRow
                                    label={`CGST (${cgstRate}%)`}
                                    value={fmt(cgst)}
                                    muted
                                    C={C}
                                />
                            )}

                            {/* Pre-wallet subtotal divider */}
                            <View style={[invM.divider, { backgroundColor: C.border }]} />

                            {/* Wallet deduction */}
                            {walletUsed > 0 && (
                                <>
                                    <InvRow
                                        label="Pre-wallet Total"
                                        value={fmt(preWalletTotal)}
                                        C={C}
                                    />
                                    <InvRow
                                        label="🎁 Referral Wallet Used"
                                        value={`-${fmt(walletUsed)}`}
                                        positive
                                        C={C}
                                    />
                                    <View style={[invM.divider, { backgroundColor: C.border }]} />
                                </>
                            )}

                            {/* Final payable line */}
                            <View style={[invM.totalRow, { backgroundColor: isDark ? '#2A2318' : '#FFF8EC', borderRadius: 12, padding: 12, marginTop: 4 }]}>
                                <View style={{ gap: 3 }}>
                                    <Text style={[invM.totalLabel, { color: C.textMuted }]}>TOTAL PAID</Text>
                                    {walletUsed > 0 && !isCash && (
                                        <Text style={invM.walletNote}>
                                            {isFullWallet
                                                ? `Fully covered by wallet`
                                                : `Gateway: ${fmt(gatewayAmount)} + Wallet: ${fmt(walletUsed)}`}
                                        </Text>
                                    )}
                                    {isCash && (
                                        <Text style={[invM.walletNote, { color: C.textMuted }]}>
                                            Cash on Delivery
                                        </Text>
                                    )}
                                </View>
                                <Text style={[invM.totalValue, { color: '#2ECC9A' }]}>
                                    {fmt(totalSettled || finalPayable)}
                                </Text>
                            </View>
                        </View>

                        <View style={{ height: 48 }} />
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

// ── Small row helper ──────────────────────────────────────────────────────────
function InvRow({ label, value, positive, muted, C }) {
    return (
        <View style={invM.bRow}>
            <Text style={[invM.bLabel, { color: muted ? C.textMuted : C.textSecondary }]}>
                {label}
            </Text>
            <Text style={[invM.bValue, { color: positive ? '#2ECC9A' : (muted ? C.textMuted : C.textSecondary) }]}>
                {value}
            </Text>
        </View>
    );
}

const invM = StyleSheet.create({
    container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14 },
    scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },

    card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },

    // Invoice ID card
    invIdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    invBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    invBadgeText: { fontSize: 10, fontWeight: '800', color: '#2ECC9A', letterSpacing: 1 },
    invNumber: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontSize: 12, letterSpacing: 0.1 },

    // Customer / Vehicle
    sectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, marginBottom: 4 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    customerName: { fontSize: 15, fontWeight: '700' },
    customerDetail: { fontSize: 12 },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    tagText: { fontSize: 10, fontWeight: '600' },

    // Line items
    itemBox: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    lineItem: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingHorizontal: 12, paddingVertical: 12, gap: 8,
    },
    itemName: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
    itemMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 },
    itemMetaText: { fontSize: 11 },
    priceCol: { alignItems: 'flex-end', gap: 3 },
    strikePrice: { fontSize: 11, textDecorationLine: 'line-through' },
    itemPrice: { fontSize: 13, fontWeight: '700' },
    savingsBadge: { backgroundColor: 'rgba(46,204,154,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    savingsBadgeText: { fontSize: 10, fontWeight: '700', color: '#2ECC9A' },

    // Breakdown rows
    bRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
    bLabel: { fontSize: 13, flex: 1 },
    bValue: { fontSize: 13, fontWeight: '600' },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },

    // Total
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
    totalValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    walletNote: { fontSize: 10, fontWeight: '700', color: '#2ECC9A', letterSpacing: 0.2 },
});
