# Copyright (c) 2026, Naqeeb Khan and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ExistingClients(Document):
	def validate(self):
		if self.crm_lead:
			lead_doc = frappe.get_doc('CRM Leads', self.crm_lead)
			lead_doc.status = 'Existing Client'
			lead_doc.existing_client = self.name
			lead_doc.save(ignore_permissions=True)

	def on_trash(self):
		if self.crm_lead:
			lead_doc = frappe.get_doc('CRM Leads', self.crm_lead)
			lead_doc.status = 'Lead'
			lead_doc.existing_client = ""
			lead_doc.save(ignore_permissions=True)