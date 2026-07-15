import frappe

def update_client_script():
    script_name = "Child Table Notification Rule Script"

    new_script = """
frappe.ui.form.on('Child Table Notification Rule', {

    refresh: function(frm) {
        // Repopulate dropdowns when form loads with existing data
        if (frm.doc.parent_doctype) {
            load_child_table_fields(frm);
        }
        if (frm.doc.child_doctype) {
            load_date_fields(frm);
        }
    },

    parent_doctype: function(frm) {
        // Reset dependent fields on parent change
        frm.set_value('child_table_field', '');
        frm.set_value('child_doctype', '');
        frm.set_value('date_field', '');
        frm.set_df_property('child_table_field', 'options', '');
        frm.set_df_property('date_field', 'options', '');
        frm.refresh_field('child_table_field');
        frm.refresh_field('date_field');

        if (frm.doc.parent_doctype) {
            load_child_table_fields(frm);
        }
    },

    child_table_field: function(frm) {
        frm.set_value('child_doctype', '');
        frm.set_value('date_field', '');
        frm.set_df_property('date_field', 'options', '');
        frm.refresh_field('date_field');

        if (!frm.doc.child_table_field || !frm.doc.parent_doctype) return;

        // Fetch child doctype name from server API
        frappe.call({
            method: 'techner.techner.custom.child_notification_engine.get_child_table_fields',
            args: { parent_doctype: frm.doc.parent_doctype },
            callback: function(r) {
                if (r.message) {
                    var match = r.message.find(f => f.fieldname === frm.doc.child_table_field);
                    if (match && match.options) {
                        frm.set_value('child_doctype', match.options);
                    }
                }
            }
        });
    },

    child_doctype: function(frm) {
        frm.set_value('date_field', '');
        frm.set_df_property('date_field', 'options', '');
        frm.refresh_field('date_field');

        if (frm.doc.child_doctype) {
            load_date_fields(frm);
        }
    }
});

function load_child_table_fields(frm) {
    frappe.call({
        method: 'techner.techner.custom.child_notification_engine.get_child_table_fields',
        args: { parent_doctype: frm.doc.parent_doctype },
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                var options = [''].concat(r.message.map(f => f.fieldname));
                frm.set_df_property('child_table_field', 'options', options.join('\\n'));
                frm.refresh_field('child_table_field');
            } else {
                frappe.show_alert({
                    message: 'No child table fields found in ' + frm.doc.parent_doctype,
                    indicator: 'orange'
                });
            }
        }
    });
}

function load_date_fields(frm) {
    frappe.call({
        method: 'techner.techner.custom.child_notification_engine.get_date_fields_for_doctype',
        args: { child_doctype: frm.doc.child_doctype },
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                var options = [''].concat(r.message.map(f => f.fieldname));
                frm.set_df_property('date_field', 'options', options.join('\\n'));
                frm.refresh_field('date_field');
            }
        }
    });
}
"""

    if frappe.db.exists("Client Script", script_name):
        doc = frappe.get_doc("Client Script", script_name)
        doc.script = new_script
        doc.save(ignore_permissions=True)
        print(f"Updated Client Script: {script_name}")
    else:
        doc = frappe.get_doc({
            "doctype": "Client Script",
            "name": script_name,
            "dt": "Child Table Notification Rule",
            "module": "Techner",
            "script": new_script
        })
        doc.insert(ignore_permissions=True)
        print(f"Created Client Script: {script_name}")

if __name__ == "__main__":
    update_client_script()
