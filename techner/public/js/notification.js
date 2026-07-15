// Copyright (c) 2026, Naqeeb Khan and contributors
// For license information, please see license.txt

frappe.ui.form.on('Notification', {

    // ─── Refresh ───────────────────────────────────────
    refresh(frm) {
        toggle_child_fields(frm);
        // Agar document_type set hai to options pre-load karo
        if (frm.doc.document_type && frm.doc.custom_enable_notification_for_child) {
            load_child_table_options(frm);
            if (frm.doc.custom_child_doctype) {
                load_child_field_options(frm);
            }
        }
    },

    // ─── Enable/Disable Toggle ─────────────────────────
    custom_enable_notification_for_child(frm) {
        toggle_child_fields(frm);
        if (!frm.doc.custom_enable_notification_for_child) {
            frm.set_value('custom_child_doctype', '');
            frm.set_value('custom_child_table_field', '');
            frm.set_value('custom_event_type', '');
        }
    },

    // ─── Document Type Change ──────────────────────────
    document_type(frm) {
        frm.set_value('custom_child_doctype', '');
        frm.set_value('custom_child_table_field', '');

        if (!frm.doc.document_type || !frm.doc.custom_enable_notification_for_child) return;

        load_child_table_options(frm);
    },

    // ─── Child Table Field (fieldname) Change ─────────
    custom_child_doctype(frm) {
        frm.set_value('custom_child_table_field', '');

        if (!frm.doc.document_type || !frm.doc.custom_child_doctype) {
            frm.set_df_property('custom_child_table_field', 'options', '');
            frm.refresh_field('custom_child_table_field');
            return;
        }

        load_child_field_options(frm);
    },

    // ─── Child Table Field to Watch Change ────────────
    custom_child_table_field(frm) {
        // Jab field change ho, event_type options adjust karo
        update_event_type_hint(frm);
    },

    // ─── Event Type Change ────────────────────────────
    custom_event_type(frm) {
        // koi UI feedback chahiye to yahan add karo
    }
});


// ─────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────

function toggle_child_fields(frm) {
    let enabled = frm.doc.custom_enable_notification_for_child ? true : false;
    frm.toggle_display('custom_child_doctype', enabled);
    frm.toggle_display('custom_child_table_field', enabled);
    frm.toggle_display('custom_event_type', enabled);
}

function load_child_table_options(frm) {
    if (!frm.doc.document_type) return;

    frappe.model.with_doctype(frm.doc.document_type, function () {
        let meta = frappe.get_meta(frm.doc.document_type);
        let table_fields = meta.fields.filter(
            df => df.fieldtype === 'Table' || df.fieldtype === 'Table MultiSelect'
        );
        let options = table_fields.map(df => df.fieldname);

        frm.set_df_property('custom_child_doctype', 'options', [''].concat(options).join('\n'));
        frm.refresh_field('custom_child_doctype');
    });
}

function load_child_field_options(frm) {
    if (!frm.doc.document_type || !frm.doc.custom_child_doctype) return;

    let meta = frappe.get_meta(frm.doc.document_type);
    let table_df = meta.fields.find(df => df.fieldname === frm.doc.custom_child_doctype);
    if (!table_df || !table_df.options) return;

    let child_doctype_name = table_df.options;

    frappe.model.with_doctype(child_doctype_name, function () {
        let child_meta = frappe.get_meta(child_doctype_name);
        let field_options = child_meta.fields
            // Sirf Date datatype wale child-table fields selectable hon.
            .filter(df => df.fieldtype === 'Date')
            .map(df => df.fieldname);

        frm.set_df_property('custom_child_table_field', 'options', [''].concat(field_options).join('\n'));
        frm.refresh_field('custom_child_table_field');

        // Field load hone ke baad event type hint update karo
        update_event_type_hint(frm);
    });
}

function update_event_type_hint(frm) {
    if (!frm.doc.document_type || !frm.doc.custom_child_doctype || !frm.doc.custom_child_table_field) return;

    let meta = frappe.get_meta(frm.doc.document_type);
    let table_df = meta.fields.find(df => df.fieldname === frm.doc.custom_child_doctype);
    if (!table_df || !table_df.options) return;

    let child_meta = frappe.get_meta(table_df.options);
    if (!child_meta) return;

    let watched_df = child_meta.fields.find(df => df.fieldname === frm.doc.custom_child_table_field);
    if (!watched_df) return;

    let is_date_field = ['Date', 'Datetime'].includes(watched_df.fieldtype);

    if (is_date_field) {
        // Date field hai — scheduler events relevant hain
        frappe.show_alert({
            message: `<b>${frm.doc.custom_child_table_field}</b> is <b>${watched_df.fieldtype}</b> field.<br>
                      To send notifications when the date matches, please select either <b>Daily Scheduler</b> or <b>Date Based Reminder</b>.`,
            indicator: 'blue'
        }, 6);
    } else {
        // Non-date field
        frappe.show_alert({
            message: `<b>${frm.doc.custom_child_table_field}</b> is <b>${watched_df.fieldtype}</b> field.<br>
                      Please use Document save/submit events or schedulars
                      .`,
            indicator: 'orange'
        }, 5);
    }
}
