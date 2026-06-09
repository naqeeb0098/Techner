frappe.listview_settings["Job Applicant"] = frappe.listview_settings["Job Applicant"] || {};

let og_onload = frappe.listview_settings["Job Applicant"].onload;

frappe.listview_settings["Job Applicant"].onload = function (listview) {
	if (og_onload) og_onload(listview);

	let $search_wrapper = $(`
			<div class="resume-search-wrapper" style="display: inline-flex; gap: 8px; margin-right: 15px;">
				<input type="text" class="form-control input-sm" placeholder="Resume Search1" style="width: 140px;">
				<input type="text" class="form-control input-sm" placeholder="Resume Search1" style="width: 140px;">
				<input type="text" class="form-control input-sm" placeholder="Resume Search1" style="width: 140px;">
			</div>
		`);

	// Prepend to page actions area so it displays nicely next to buttons
	listview.page.wrapper.find('.page-actions').prepend($search_wrapper);

	let $search_inputs = $search_wrapper.find('input');

	// Handle typing / enter / blur to trigger filter
	$search_inputs.on('change', function () {
		// Remove existing custom_resume_extraction filters
		if (listview.filter_area.filter_list && listview.filter_area.filter_list.filters) {
			let existing_filters = listview.filter_area.filter_list.filters.filter(f => f.fieldname === 'custom_resume_extraction');
			existing_filters.forEach(f => f.remove());
		}

		let filters_to_add = [];
		$search_inputs.each(function () {
			let val = $(this).val();
			if (val && val.trim()) {
				val = '%' + val.trim() + '%';
				filters_to_add.push(['Job Applicant', 'custom_resume_extraction', 'like', val]);
			}
		});

		if (filters_to_add.length > 0) {
			listview.filter_area.add(filters_to_add);
		} else {
			listview.refresh();
		}
	});
};
