// Copyright (c) 2026, Naqeeb Khan and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Child Table Notification Rule", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on('Child Table Notification Rule', {
    onload: function(frm) {
        frm.trigger('setup_options');
    },
    refresh: function(frm) {
        frm.trigger('setup_options');
    },
    setup_options: function(frm) {
        if (frm.doc.parent_doctype) {
            frappe.model.with_doctype(frm.doc.parent_doctype, function() {
                let meta = frappe.get_meta(frm.doc.parent_doctype);
                let table_fields = meta.fields.filter(
                    df => df.fieldtype === 'Table' || df.fieldtype === 'Table MultiSelect'
                );
                let options = table_fields.map(df => df.options);
                frm.set_df_property('child_doctype', 'options', [''].concat(options).join('\n'));
                frm.refresh_field('child_doctype');
                
                if (frm.doc.child_doctype) {
                    frappe.model.with_doctype(frm.doc.child_doctype, function() {
                        let child_meta = frappe.get_meta(frm.doc.child_doctype);
                        let date_fields = child_meta.fields
                            .filter(df => df.fieldtype === 'Date' || df.fieldtype === 'Datetime')
                            .map(df => df.fieldname);
                        frm.set_df_property('child_table_field', 'options', [''].concat(date_fields).join('\n'));
                        frm.refresh_field('child_table_field');
                    });
                }
            });
        }
    },
    parent_doctype: function(frm) {
        if (!frm.doc.parent_doctype) {
            frm.set_value('child_doctype', '');
            frm.set_value('child_table_field', '');
            frm.set_df_property('child_doctype', 'options', '');
            frm.refresh_field('child_doctype');
            return;
        }

        frappe.model.with_doctype(frm.doc.parent_doctype, function() {
            let meta = frappe.get_meta(frm.doc.parent_doctype);
            let table_fields = meta.fields.filter(
                df => df.fieldtype === 'Table' || df.fieldtype === 'Table MultiSelect'
            );
            let options = table_fields.map(df => df.options);

            frm.set_df_property('child_doctype', 'options', [''].concat(options).join('\n'));
            frm.refresh_field('child_doctype');

            if (frm.doc.child_doctype && !options.includes(frm.doc.child_doctype)) {
                frm.set_value('child_doctype', '');
                frm.set_value('child_table_field', '');
            }
        });
    },
    child_doctype: function(frm) {
        if (!frm.doc.child_doctype) {
            frm.set_value('child_table_field', '');
            frm.set_df_property('child_table_field', 'options', '');
            frm.refresh_field('child_table_field');
            return;
        }

        frappe.model.with_doctype(frm.doc.child_doctype, function() {
            let child_meta = frappe.get_meta(frm.doc.child_doctype);
            let date_fields = child_meta.fields
                .filter(df => df.fieldtype === 'Date' || df.fieldtype === 'Datetime')
                .map(df => df.fieldname);

            frm.set_df_property('child_table_field', 'options', [''].concat(date_fields).join('\n'));
            frm.refresh_field('child_table_field');

            if (frm.doc.child_table_field && !date_fields.includes(frm.doc.child_table_field)) {
                frm.set_value('child_table_field', '');
            }
        });
    }
});