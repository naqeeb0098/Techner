import frappe
from frappe import _
from frappe.model.document import Document


class BasicIDForm(Document):
	def validate(self):
		self.validate_email_availability()

	def after_insert(self):
		self.update_email_usage_status()

	def validate_email_availability(self):
		"""
		Check if the email exists in 'Basic Id Form Emails' and is not already used.
		Provide specific error messages based on the status.
		"""
		email = self.email or self.email_address
		if not email:
			return

		# Check if email exists at all in any 'Basic Id Form Emails'
		email_status = frappe.db.sql("""
			SELECT 
				child.is_used as child_used,
				parent.is_used as parent_used,
				parent.name as parent_name,
				child.name as child_name
			FROM 
				`tabBasic Id Form Emails` parent
			JOIN 
				`tabEmails Details` child ON child.parent = parent.name
			WHERE 
				child.email = %s
			LIMIT 1
		""", (email), as_dict=True)

		if not email_status:
			# Case 1: Email not found in the authorized list
			frappe.throw(_("Unauthorized: The email address '{0}' is not authorized for this form.").format(email), frappe.PermissionError)
		
		# Take the first record
		record = email_status[0]
		
		if record.child_used == 1 or record.parent_used == 1:
			# Case 2: Email found but already marked as used
			frappe.throw(_("Error: This email '{0}' has already been used. You cannot create another request against this email.").format(email))

		# If everything is fine, store for update
		self._email_parent = record.parent_name
		self._email_child = record.child_name

	def update_email_usage_status(self):
		"""
		Mark the email row as used and sync parent status.
		"""
		if hasattr(self, '_email_child') and self._email_child:
			# Mark child row as used
			frappe.db.set_value('Emails Details', self._email_child, 'is_used', 1)
			
			# Check if all child rows for this parent are now used
			parent_name = self._email_parent
			total_rows = frappe.db.count('Emails Details', {'parent': parent_name})
			used_rows = frappe.db.count('Emails Details', {'parent': parent_name, 'is_used': 1})
			
			if total_rows == used_rows:
				# Mark parent as used
				frappe.db.set_value('Basic Id Form Emails', parent_name, 'is_used', 1)
			
			frappe.db.commit()
