// Copyright (c) 2026, Naqeeb Khan and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Child Table Notification Rule", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on('Child Table Notification Rule', {
    parent_doctype: function(frm) {
        frm.set_value('child_table_field', '');
        frm.set_value('child_doctype', '');

        if (!frm.doc.parent_doctype) {
            frm.set_df_property('child_table_field', 'options', '');
            frm.refresh_field('child_table_field');
            return;
        }

        frappe.model.with_doctype(frm.doc.parent_doctype, function() {
            let meta = frappe.get_meta(frm.doc.parent_doctype);
            let table_fields = meta.fields.filter(
                df => df.fieldtype === 'Table' || df.fieldtype === 'Table MultiSelect'
            );
            let options = table_fields.map(df => df.fieldname);

            frm.set_df_property('child_table_field', 'options', [''].concat(options).join('\n'));
            frm.refresh_field('child_table_field');
        });
    },

    child_table_field: function(frm) {
        frm.set_value('child_doctype', '');

        if (!frm.doc.parent_doctype || !frm.doc.child_table_field) {
            frm.set_df_property('child_doctype', 'options', '');
            frm.refresh_field('child_doctype');
            return;
        }

        let meta = frappe.get_meta(frm.doc.parent_doctype);
        let table_field = meta.fields.find(df => df.fieldname === frm.doc.child_table_field);

        if (!table_field || !table_field.options) return;

        let child_doctype_name = table_field.options;

        frappe.model.with_doctype(child_doctype_name, function() {
            let child_meta = frappe.get_meta(child_doctype_name);
            let field_options = child_meta.fields
                .filter(df => !frappe.model.no_value_type.includes(df.fieldtype))
                .map(df => df.fieldname);

            frm.set_df_property('child_doctype', 'options', [''].concat(field_options).join('\n'));
            frm.refresh_field('child_doctype');
        });
    }
});