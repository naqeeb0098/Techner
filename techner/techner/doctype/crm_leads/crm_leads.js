// Copyright (c) 2026, Naqeeb Khan and contributors
// For license information, please see license.txt

frappe.ui.form.on("CRM Leads", {
    refresh: function(frm) {
        // Sirf tab dikhao jab status Open ho
        if (!frm.is_new()) {
            
            // On Call Visit button
            frm.add_custom_button(__('Existing Client'), function() {
                frappe.new_doc('Existing Clients', {
                    crm_lead: frm.doc.name,
                    client_name: frm.doc.client_name,
                    group: frm.doc.group,
                    client_website: frm.doc.client_website,
                    sales_manager: frm.doc.sales_manager,
                    name1: frm.doc.name1,
                    about_company__opportunity: frm.doc.about_company__opportunity
                });
            }, __('Create'));  // <-- yeh "Create" dropdown ke andar dalega
        }
    }
});
