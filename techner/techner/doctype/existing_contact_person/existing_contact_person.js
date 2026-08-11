// Copyright (c) 2026, Naqeeb Khan and contributors
// For license information, please see license.txt

frappe.ui.form.on("Existing Contact Person", {
    refresh: function(frm) {
            if (!frm.is_new()) {
                // On Call Visit button
                frm.add_custom_button(__('CRM Leads'), function() {
                    frappe.new_doc('CRM Leads', {
                        // crm_lead: frm.doc.name,
                        client_name: frm.doc.contact_person_name,
                        existing_contact_person:frm.doc.contact_person_email
                    });
                }, __('Create'));  
            }
        }
});
