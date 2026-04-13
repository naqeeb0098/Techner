# Copyright (c) 2026, Naqeeb Khan and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class SiteProjects(Document):
	def on_update(self):
		self.sync_deleted_site_trackers()
		self.create_site_trackers()
		self.sync_milestones_to_trackers()

	def on_trash(self):
		self.delete_all_site_trackers()

	def sync_deleted_site_trackers(self):
		if self.is_new():
			return

		old_doc = self.get_doc_before_save()
		if not old_doc:
			return

		current_trackers = [row.site_tracker for row in self.get("projects_site_details") if row.site_tracker]
		for old_row in old_doc.get("projects_site_details"):
			if old_row.site_tracker and old_row.site_tracker not in current_trackers:
				if frappe.db.exists("Site Tracker", old_row.site_tracker):
					frappe.delete_doc("Site Tracker", old_row.site_tracker, ignore_permissions=True)

	def create_site_trackers(self):
		for row in self.get("projects_site_details"):
			if not row.site_tracker and row.site:
				# Create Site Tracker
				tracker = frappe.new_doc("Site Tracker")
				tracker.project = self.name
				tracker.site = row.site
				
				tracker.insert(ignore_permissions=True)
				
				# Update the site_tracker reference in the child table row without triggering save on parent
				row.db_set("site_tracker", tracker.name)
				row.site_tracker = tracker.name # Set it on current object to sync subsequently

	def sync_milestones_to_trackers(self):
		old_doc = self.get_doc_before_save()
		old_milestones_map = {}
		if old_doc:
			old_milestones_map = {row.project_milestone: row for row in old_doc.get("project_details_milestone") if row.project_milestone}

		for site_row in self.get("projects_site_details"):
			if site_row.site_tracker and frappe.db.exists("Site Tracker", site_row.site_tracker):
				tracker = frappe.get_doc("Site Tracker", site_row.site_tracker)
				
				# Keep existing tracker rows to preserve dashboard modifications
				existing_tracker_rows = {m.project_milestone: m for m in tracker.get("table_xyls") if m.project_milestone}
				
				# Clear existing milestones to rebuild in current order
				tracker.set("table_xyls", [])
				
				# Rebuild rows based on the current Project milestones
				for p_row in self.get("project_details_milestone"):
					m_name = p_row.project_milestone
					if not m_name:
						continue
						
					if m_name in existing_tracker_rows:
						# Row existed in tracker, copy its existing data to prevent resetting
						t_row = existing_tracker_rows[m_name]
						new_data = {
							"project_milestone": m_name,
							"status": t_row.status,
							"forcast": t_row.forcast,
							"actual": t_row.actual,
							"remarks": t_row.remarks,
							"assign_to": t_row.assign_to
						}
						
						# If it previously existed in Site Project too, check for selective field updates
						if m_name in old_milestones_map:
							old_p_row = old_milestones_map[m_name]
							for field in ["status", "forcast", "actual", "remarks", "assign_to"]:
								if p_row.get(field) != old_p_row.get(field):
									# Field was changed in Site Project, so push the override to Trackers
									new_data[field] = p_row.get(field)
						
						tracker.append("table_xyls", new_data)
					else:
						# Completely new milestone in Site Project
						tracker.append("table_xyls", {
							"project_milestone": m_name,
							"status": p_row.status,
							"forcast": p_row.forcast,
							"actual": p_row.actual,
							"remarks": p_row.remarks,
							"assign_to": p_row.assign_to
						})
				
				tracker.save(ignore_permissions=True)

	def delete_all_site_trackers(self):
		for row in self.get("projects_site_details"):
			if row.site_tracker and frappe.db.exists("Site Tracker", row.site_tracker):
				frappe.delete_doc("Site Tracker", row.site_tracker, ignore_permissions=True)
