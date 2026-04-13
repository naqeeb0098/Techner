frappe.listview_settings["Application Form"] = frappe.listview_settings["Application Form"] || {};

let og_onload_app = frappe.listview_settings["Application Form"].onload;

frappe.listview_settings["Application Form"].onload = function (listview) {
	if (og_onload_app) og_onload_app(listview);

	// Add custom resume text search field bypassing Frappe's auto-filter logic
	let $search_wrapper = $(`
		<div class="resume-search-wrapper" style="display: inline-block; margin-right: 15px;">
			<input type="text" class="form-control input-sm" placeholder="Search in Resumes..." style="width: 200px; display: inline-block;">
		</div>
	`);

	// Prepend to page actions area so it displays nicely next to buttons
	listview.page.wrapper.find('.page-actions').prepend($search_wrapper);

	let $search_input = $search_wrapper.find('input');

	// Handle typing / enter / blur to trigger filter
	$search_input.on('change', function () {
		let val = $(this).val();

		// Remove existing resume_extraction filter directly
		if (listview.filter_area.filter_list && listview.filter_area.filter_list.filters) {
			let existing_filters = listview.filter_area.filter_list.filters.filter(f => f.fieldname === 'resume_extraction');
			existing_filters.forEach(f => f.remove());
		}

		if (val && val.trim()) {
			// We enforce %word% format
			val = '%' + val.trim() + '%';
			listview.filter_area.add([
				['Application Form', 'resume_extraction', 'like', val]
			]);
		} else {
			listview.refresh();
		}
	});
};
