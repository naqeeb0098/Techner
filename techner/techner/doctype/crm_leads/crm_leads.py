# Copyright (c) 2026, Naqeeb Khan and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class CRMLeads(Document):
    
    def after_insert(self):
    	if self.existing_contact_person:
        	frappe.db.set_value( "Existing Contact Person", self.existing_contact_person, "crm_lead", self.name )