frappe.pages['applicant-tracker-report'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __('Applicant Tracker Report'),
		single_column: true
	});

	page.main.append(`
		<div id="tracker-container" style="padding: 20px;">
			<div class="tracker-header-info" style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 5px solid #3b82f6;">
				<h5 style="margin: 0; color: #1e293b;">Interactive Applicant Tracker</h5>
				<p style="margin: 5px 0 0 0; font-size: 13px; color: #64748b;">Update fields directly in the table. Changes are saved automatically.</p>
			</div>
			<div id="tracker-board" style="overflow-x: auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
				<div class="loading-state" style="padding: 50px; text-align: center; color: #64748b;">
					<i class="fa fa-spinner fa-spin fa-2x"></i>
					<div style="margin-top: 10px;">Fetching records...</div>
				</div>
			</div>
		</div>
	`);

	// Setup Filters
	let f_applicant = page.add_field({ fieldtype: 'Link', fieldname: 'job_applicant', options: 'Job Applicant', label: __('Job Applicant'), change: () => refresh_data() });
	let f_opening = page.add_field({ fieldtype: 'Link', fieldname: 'job_opening', options: 'Job Opening', label: __('Job Opening'), change: () => refresh_data() });
	let f_from = page.add_field({ fieldtype: 'Date', fieldname: 'from_date', label: __('From Date'), change: () => refresh_data() });
	let f_to = page.add_field({ fieldtype: 'Date', fieldname: 'to_date', label: __('To Date'), change: () => refresh_data() });
	let f_name = page.add_field({ fieldtype: 'Data', fieldname: 'applicant_name', label: __('Applicant Name'), change: () => refresh_data() });
	let f_source = page.add_field({ fieldtype: 'Data', fieldname: 'job_applicant_source', label: __('Source'), change: () => refresh_data() });

	let tracker_data = [];
	let field_meta = {};
	let fields_order = [];

	function refresh_data() {
		let filters = {
			job_applicant: f_applicant.get_value(),
			job_opening: f_opening.get_value(),
			from_date: f_from.get_value(),
			to_date: f_to.get_value(),
			applicant_name: f_name.get_value(),
			job_applicant_source: f_source.get_value()
		};

		$('#tracker-board').html(`
			<div class="loading-state" style="padding: 50px; text-align: center; color: #64748b;">
				<i class="fa fa-spinner fa-spin fa-2x"></i>
				<div style="margin-top: 10px;">Refreshing data...</div>
			</div>
		`);

		frappe.call({
			method: 'techner.techner.page.applicant_tracker_report.applicant_tracker_report.get_tracker_data',
			args: { filters: filters },
			callback: function (r) {
				if (r.message) {
					tracker_data = r.message.data;
					field_meta = r.message.field_meta;
					fields_order = r.message.fields_order;
					render_table();
				}
			}
		});
	}

	function render_table() {
		let html = `
			<style>
				@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

				#tracker-board { 
					border: 1px solid #e2e8f0; 
					border-radius: 12px; 
					overflow: auto; 
					background: #fff; 
					box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
					max-height: 75vh;
				}
				.tracker-table { 
					width: 100%; 
					border-collapse: separate; 
					border-spacing: 0; 
					font-family: 'Inter', sans-serif;
				}
				
				/* Premium Sticky Header */
				.tracker-table th { 
					position: sticky; top: 0; 
					background: #f8fafc;
					color: #1e293b; 
					padding: 12px 14px; 
					font-weight: 700; 
					text-align: left; 
					font-size: 11px; 
					text-transform: uppercase; 
					border-bottom: 2px solid #e2e8f0; 
					border-right: 1px solid #f1f5f9;
					z-index: 20;
					white-space: nowrap; 
					letter-spacing: 0.05em;
				}

				/* Column Grouping Highlights */
				.group-primary { background: #fdf2f2 !important; color: #991b1b !important; border-bottom: 2px solid #fecaca !important; }
				.group-status { background: #eff6ff !important; color: #1e40af !important; border-bottom: 2px solid #bfdbfe !important; }
				.group-feedback { background: #f0fdf4 !important; color: #166534 !important; border-bottom: 2px solid #bbf7d0 !important; }

				/* Rows & Cells */
				.tracker-table td { 
					padding: 6px 10px; 
					border-bottom: 1px solid #f1f5f9; 
					border-right: 1px solid #f8fafc;
					font-size: 12.5px; 
					color: #475569; 
					vertical-align: middle;
					transition: background 0.1s ease;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
					max-width: 250px;
				}
				.tracker-table tr:hover td { background-color: #f8fafc !important; }
				
				/* Interactive Inputs */
				.cell-input { 
					width: 100%; border: 1px solid transparent; background: transparent; 
					padding: 4px 8px; border-radius: 6px; font-size: 12px;
					height: 28px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
					color: #1e293b; font-weight: 400;
				}
				.cell-input:hover:not([disabled]) { 
					background: #fff; border-color: #cbd5e1; 
					box-shadow: 0 2px 4px rgba(0,0,0,0.05);
				}
				.cell-input:focus:not([disabled]) { 
					border-color: #6366f1; background: #fff; outline: none; 
					box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); 
				}

				/* Special Styling for Long Text (Skillset, Reasoning) */
				.text-preview {
					cursor: pointer; display: block; overflow: hidden; 
					text-overflow: ellipsis; white-space: nowrap;
					color: #6366f1; font-weight: 500; font-style: italic;
					padding: 2px 4px; border-radius: 4px; border: 1px dashed #e0e7ff;
				}
				.text-preview:hover { background: #eef2ff; color: #4338ca; }

				/* Badges for Select Fields */
				.status-badge {
					display: inline-block; padding: 2px 8px; border-radius: 9999px;
					font-size: 10.5px; font-weight: 600; text-transform: uppercase;
				}
				
				/* Custom Scrollbar */
				#tracker-board::-webkit-scrollbar { height: 10px; width: 6px; }
				#tracker-board::-webkit-scrollbar-track { background: #f8fafc; }
				#tracker-board::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 5px; }
				#tracker-board::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

				/* Indicators */
				.saving { background-color: #fef9c3 !important; border-color: #fde047 !important; }
				.saved { background-color: #dcfce7 !important; border-color: #86efac !important; }
				.error { background-color: #fee2e2 !important; border-color: #fca5a5 !important; }

				.id-cell { font-weight: 700; color: #1e293b; }
			</style>
			
			<!-- Modal for Large Text Editing -->
			<div id="text-edit-modal" class="modal" tabindex="-1" style="display:none; background: rgba(0,0,0,0.5);">
				<div class="modal-dialog modal-lg">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title">Edit Content</h5>
							<button type="button" class="close" onclick="$('#text-edit-modal').hide()">&times;</button>
						</div>
						<div class="modal-body">
							<textarea id="modal-textarea" class="form-control" style="height: 300px; font-family: monospace; font-size: 14px;"></textarea>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" onclick="$('#text-edit-modal').hide()">Close</button>
							<button type="button" class="btn btn-primary" id="modal-save-btn">Save Changes</button>
						</div>
					</div>
				</div>
			</div>

			<table class="tracker-table">
				<thead>
					<tr>
						<th class="id-cell">Applicant ID</th>
						${fields_order.map((f, i) => {
			let group = '';
			if (['job_applicant', 'applicant_name', 'job_opening'].includes(f)) group = 'group-primary';
			if (['recommendation', 'final_conclusion'].includes(f)) group = 'group-status';
			if (['conclusionfeedback', 'reasoning'].includes(f)) group = 'group-feedback';
			return `<th class="${group}">${field_meta[f].label}</th>`;
		}).join('')}
					</tr>
				</thead>
				<tbody>
		`;

		if (tracker_data.length === 0) {
			html += `<tr><td colspan="${fields_order.length + 1}" style="text-align: center; padding: 60px; color: #94a3b8; font-size: 14px;">No records found matching filters.</td></tr>`;
		} else {
			tracker_data.forEach(row => {
				html += `<tr>
					<td class="id-cell"><a href="/app/applicant-tracker/${row.name}" style="color: inherit; text-decoration: none;">${row.name}</a></td>
					${fields_order.map(f => {
						let meta = field_meta[f];
						let val = row[f] || '';
						let disabled = meta.read_only ? 'disabled' : '';
						
						let col_width = '120px';
						if (['job_opening', 'job_opening_title', 'skillset', 'reasoning', 'conclusionfeedback'].includes(f)) {
							col_width = '250px';
						} else if (['applicant_name', 'interviewer_name'].includes(f)) {
							col_width = '180px';
						}

						let cell_content = '';
						if (meta.fieldtype === 'Select') {
							cell_content = `<select class="cell-input" style="min-width: ${col_width}" data-doc="${row.name}" data-field="${f}" ${disabled}>
								<option value=""></option>
								${(meta.options || '').split('\n').map(opt => opt ? `<option value="${opt}" ${val === opt ? 'selected' : ''}>${opt}</option>` : '').join('')}
							</select>`;
						} else if (meta.fieldtype === 'Small Text' || meta.fieldtype === 'Text' || f === 'skillset') {
							// Large text handling with Modal
							let display_val = val ? (val.length > 40 ? val.substring(0, 40) + '...' : val) : '';
							cell_content = `<div class="text-preview" style="min-width: ${col_width}; min-height: 24px;" data-doc="${row.name}" data-field="${f}" data-fulltext="${frappe.utils.escape_html(val)}">${display_val}</div>`;
						} else if (meta.fieldtype === 'Check') {
							cell_content = `<div style="text-align:center"><input type="checkbox" class="cell-checkbox" data-doc="${row.name}" data-field="${f}" ${val ? 'checked' : ''} ${disabled}></div>`;
						} else if (meta.fieldtype === 'Date') {
							cell_content = `<input type="date" class="cell-input" style="min-width: ${col_width}" data-doc="${row.name}" data-field="${f}" value="${val}" ${disabled}>`;
						} else if (meta.fieldtype === 'Link') {
							cell_content = `<div class="link-field-container" style="min-width: ${col_width}" data-doc="${row.name}" data-field="${f}" data-options="${meta.options}" data-value="${val || ''}"></div>`;
						} else {
							cell_content = `<input type="text" class="cell-input" style="min-width: ${col_width}" data-doc="${row.name}" data-field="${f}" value="${val}" ${disabled}>`;
						}
						
						return `<td>${cell_content}</td>`;
				}).join('')}
				</tr>`;
			});
		}

		html += `</tbody></table>`;
		$('#tracker-board').html(html);

		render_link_controls();
		bind_events();
	}

	function render_link_controls() {
		$('.link-field-container').each(function () {
			let $cont = $(this);
			let docname = $cont.data('doc');
			let field = $cont.data('field');
			let options = $cont.data('options');
			let value = $cont.data('value');
			let meta = field_meta[field];

			let control = frappe.ui.form.make_control({
				parent: $cont,
				df: {
					fieldtype: 'Link',
					fieldname: field,
					options: options,
					read_only: meta.read_only,
					on_change: () => {
						let new_val = control.get_value();
						update_field(docname, field, new_val, $cont);
					}
				},
				render_input: true
			});
			control.set_value(value);
			$cont.find('input').addClass('cell-input').css('min-width', '180px');
		});
	}

	function update_field(docname, field, val, $el) {
		$el.addClass('saving');

		frappe.call({
			method: 'techner.techner.page.applicant_tracker_report.applicant_tracker_report.update_tracker_field',
			args: { docname: docname, field: field, value: val },
			callback: function (r) {
				$el.removeClass('saving');
				if (r.message === 'success') {
					$el.addClass('saved');
					setTimeout(() => $el.removeClass('saved'), 1500);
				} else {
					$el.addClass('error');
					setTimeout(() => $el.removeClass('error'), 1500);
				}
			}
		});
	}

	function bind_events() {
		// Standard Input Change
		$('.cell-input:not(.link-input), .cell-checkbox').on('change', function () {
			let $el = $(this);
			if ($el.closest('.link-field-container').length) return;

			let docname = $el.data('doc');
			let field = $el.data('field');
			let val = $el.is(':checkbox') ? ($el.is(':checked') ? 1 : 0) : $el.val();

			update_field(docname, field, val, $el);
		});

		// Text Preview Modal Trigger
		$('.text-preview').on('click', function () {
			let $el = $(this);
			let fulltext = $el.attr('data-fulltext');
			let docname = $el.data('doc');
			let field = $el.data('field');

			$('#modal-textarea').val(fulltext);
			$('#text-edit-modal').show();

			$('#modal-save-btn').off('click').on('click', function () {
				let new_val = $('#modal-textarea').val();
				update_field(docname, field, new_val, $el);
				$el.attr('data-fulltext', new_val);
				$el.text(new_val ? new_val.substring(0, 30) + '...' : 'Click to edit...');
				$('#text-edit-modal').hide();
			});
		});
	}

	page.set_primary_action(__('Refresh'), () => refresh_data());
	refresh_data();
}

page.set_primary_action(__('Refresh'), () => refresh_data());

// Initial Load
refresh_data();

