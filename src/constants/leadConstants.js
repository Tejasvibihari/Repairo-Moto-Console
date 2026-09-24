// src/constants/leadConstants.js
// Mirrors the `status` enum in server/Models/leadModel.js.

export const LEAD_STATUS = {
    new: { label: 'New', color: '#3B82F6', icon: 'sparkles-outline' },
    called: { label: 'Called', color: '#8B5CF6', icon: 'call-outline' },
    interested: { label: 'Interested', color: '#2ECC9A', icon: 'thumbs-up-outline' },
    follow_up: { label: 'Follow-up', color: '#e2a731', icon: 'alarm-outline' },
    booked: { label: 'Booked', color: '#10B981', icon: 'calendar-outline' },
    not_interested: { label: 'Not interested', color: '#FF6B6B', icon: 'thumbs-down-outline' },
    not_reachable: { label: 'Not reachable', color: '#9E8E78', icon: 'close-circle-outline' },
    completed: { label: 'Completed', color: '#059669', icon: 'checkmark-done-outline' },
    direct_booking: { label: 'Direct booking', color: '#0EA5E9', icon: 'flash-outline' },
};

// Statuses shown as filter chips on the Leads screen (order matters).
export const FILTER_STATUSES = [
    'new',
    'called',
    'interested',
    'follow_up',
    'booked',
    'not_interested',
    'not_reachable',
    'completed',
    'direct_booking',
];

// Statuses a telecaller can set by hand. `new` is the starting state,
// `completed` / `direct_booking` are set from the admin side once an
// invoice exists, so they are left out here. Edit this list if your
// process is different.
export const TELECALLER_STATUS_OPTIONS = [
    'called',
    'interested',
    'follow_up',
    'booked',
    'not_interested',
    'not_reachable',
];

// Outcomes that end the follow-up cycle: the follow-up date is cleared
// when the lead moves to one of these so it stops counting on the
// dashboard's "follow-ups today".
export const CLOSING_STATUSES = ['booked', 'not_interested', 'completed', 'direct_booking'];

export const LEAD_SOURCES = [
    'instagram',
    'facebook',
    'google',
    'whatsapp',
    'referral',
    'walk_in',
    'website',
    'other',
];

export const sourceLabel = (s = '') =>
    s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
