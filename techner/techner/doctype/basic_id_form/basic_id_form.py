import frappe
from frappe import _
from frappe.model.document import Document

class BasicIDForm(Document):

	def validate(self):
		self.validate_email_token_revision()
		self.validate_email_availability()

	def validate_email_token_revision(self):

		email = self.email or self.email_address
		token = self.token
		revision = self.revision

		if not email:
			frappe.throw(_("Email is required"))

		if not token:
			frappe.throw(_("Token is required"))

		# Check email + token + revision together
		record = frappe.db.sql("""
			SELECT 
				child.name as child_name,
				child.is_used,
				child.token,
				child.revision,
				parent.name as parent_name
			FROM 
				`tabBasic Id Form Emails` parent
			JOIN 
				`tabEmails Details` child ON child.parent = parent.name
			WHERE 
				child.email = %s
				AND child.token = %s
				AND child.revision = %s
			LIMIT 1
		""", (email, token, revision), as_dict=True)

		if not record:
			frappe.throw(
				_("Invalid link: Email, Token or Revision does not match."),
				frappe.PermissionError
			)

		rec = record[0]

		if rec.is_used == 1:
			frappe.throw(_("This link has already been used."))

		# store for update
		self._child_name = rec.child_name
		self._parent_name = rec.parent_name

	def after_insert(self):
		self.update_email_usage_status()

	def update_email_usage_status(self):
		if hasattr(self, "_child_name") and self._child_name:
			frappe.db.set_value("Emails Details", self._child_name, "is_used", 1)

			parent = self._parent_name
			total = frappe.db.count("Emails Details", {"parent": parent})
			used = frappe.db.count("Emails Details", {"parent": parent, "is_used": 1})

			if total == used:
				frappe.db.set_value("Basic Id Form Emails", parent, "is_used", 1)


# import frappe
# from frappe import _
# from frappe.model.document import Document


# class BasicIDForm(Document):
# 	def validate(self):
# 		self.validate_email_availability()

# 	def after_insert(self):
# 		self.update_email_usage_status()

# 	def validate_email_availability(self):
# 		email = self.email or self.email_address
# 		token = self.token

# 		if not email:
# 			frappe.throw(_("Email is required"))

# 		if not token:
# 			frappe.throw(_("Token is required"))

# 		# Check email + token combination
# 		email_status = frappe.db.sql("""
# 			SELECT 
# 				child.is_used as child_used,
# 				parent.is_used as parent_used,
# 				parent.name as parent_name,
# 				child.name as child_name,
# 				child.token as child_token
# 			FROM 
# 				`tabBasic Id Form Emails` parent
# 			JOIN 
# 				`tabEmails Details` child ON child.parent = parent.name
# 			WHERE 
# 				child.email = %s
# 				AND child.token = %s
# 			LIMIT 1
# 		""", (email, token), as_dict=True)

# 		if not email_status:
# 			frappe.throw(
# 				_("Invalid Email or Token. Please use the link provided in your email."),
# 				frappe.PermissionError
# 			)

# 		record = email_status[0]

# 		if record.child_used == 1 or record.parent_used == 1:
# 			frappe.throw(
# 				_("This email/token has already been used. Multiple submissions are not allowed.")
# 			)

# 		self._email_parent = record.parent_name
# 		self._email_child = record.child_name
  
# 	def update_email_usage_status(self):
# 		"""
# 		Mark the email row as used and sync parent status.
# 		"""
# 		if hasattr(self, '_email_child') and self._email_child:
# 			# Mark child row as used
# 			frappe.db.set_value('Emails Details', self._email_child, 'is_used', 1)
			
# 			# Check if all child rows for this parent are now used
# 			parent_name = self._email_parent
# 			total_rows = frappe.db.count('Emails Details', {'parent': parent_name})
# 			used_rows = frappe.db.count('Emails Details', {'parent': parent_name, 'is_used': 1})
			
# 			if total_rows == used_rows:
# 				# Mark parent as used
# 				frappe.db.set_value('Basic Id Form Emails', parent_name, 'is_used', 1)
			
# 			frappe.db.commit()
