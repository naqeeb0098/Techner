frappe.ui.form.on('Job Applicant', {
	onload: function(frm) {
		// Restrict resume_attachment to only accept PDF files
		frm.set_df_property('resume_attachment', 'options', {
			restrictions: {
				allowed_file_types: ['.pdf']
			}
		});
	},

	refresh: function(frm) {
		add_applications_by_email_button(frm);
	}
});

// Same email se aur kitni / kaunsi applications aayi hain: count button par, details popup mein
function add_applications_by_email_button(frm) {
	if (frm.is_new() || !frm.doc.email_id) return;

	const email = frm.doc.email_id;
	frappe.call({
		method: 'techner.techner.custom.job_applicant.get_applications_by_email',
		args: { email: email },
	}).then((r) => {
		// form is beech mein kisi aur record par chala gaya ho to purana button na lagao
		if (frm.doc.email_id !== email) return;

		const applications = r.message || [];
		const label = __('Applications ({0})', [applications.length]);

		if (frm.__applications_button_label) frm.remove_custom_button(frm.__applications_button_label);
		frm.__applications_button_label = label;

		const btn = frm.add_custom_button(label, () => show_applications_dialog(frm, applications));
		btn.addClass(applications.length > 1 ? 'btn-primary' : 'btn-default');
	});
}

const NOT_SET = '__not_set__';

// Internal Status ke rang (popup ke chips, badges aur row border mein)
const INTERNAL_STATUS_COLORS = {
	'New': '#3b82f6',
	'Reviewed': '#06b6d4',
	'To be Interviewed': '#f59e0b',
	'Interviewed': '#8b5cf6',
	'Not Recommended': '#ef4444',
	'Shortlisted': '#22c55e',
	[NOT_SET]: '#94a3b8',
};

function show_applications_dialog(frm, applications) {
	const d = new frappe.ui.Dialog({
		title: __('Applications by this Email'),
		size: 'extra-large',
		fields: [{ fieldtype: 'HTML', fieldname: 'applications_html' }],
	});
	const $wrapper = d.fields_dict.applications_html.$wrapper;

	// name -> { fieldname: new value } for edits not saved yet
	let changes = {};
	let active_filter = 'all';

	const status_options = (frappe.meta.get_docfield('Job Applicant', 'custom_internal_status')?.options || '')
		.split('\n');

	d.set_primary_action(__('Save'), () => save_changes());
	const $save = d.get_primary_btn();

	const refresh_save_button = () => {
		const count = Object.keys(changes).length;
		$save.toggle(count > 0).html(count > 1 ? __('Save {0} Changes', [count]) : __('Save'));
	};

	const render = () => {
		changes = {};
		$wrapper.html(get_applications_html(frm, applications, status_options));
		apply_filter(active_filter);
		refresh_save_button();
	};

	const apply_filter = (status) => {
		active_filter = $wrapper.find(`.ja-chip[data-status="${status}"]`).length ? status : 'all';
		$wrapper.find('.ja-chip').removeClass('active');
		$wrapper.find(`.ja-chip[data-status="${active_filter}"]`).addClass('active');

		let visible = 0;
		$wrapper.find('.ja-row').each(function() {
			const show = active_filter === 'all' || $(this).attr('data-status') === active_filter;
			$(this).toggle(show);
			if (show) visible++;
		});
		$wrapper.find('.ja-showing').text(__('Showing {0} of {1}', [visible, applications.length]));
	};

	const track_change = ($input) => {
		const $row = $input.closest('.ja-row');
		const name = $row.attr('data-name');
		const fieldname = $input.attr('data-field');
		const original = applications.find((a) => a.name === name)[fieldname] || '';
		const value = $input.val();

		const row_changes = changes[name] || {};
		if (value === original) {
			delete row_changes[fieldname];
		} else {
			row_changes[fieldname] = value;
		}
		if (Object.keys(row_changes).length) {
			changes[name] = row_changes;
		} else {
			delete changes[name];
		}

		if (fieldname === 'custom_internal_status') {
			$input.closest('.ja-status-wrap').css('--c', color_of_status(value || NOT_SET));
		}
		$row.toggleClass('ja-dirty', !!changes[name]);
		refresh_save_button();
	};

	const save_changes = () => {
		const payload = Object.entries(changes).map(([name, values]) => ({ name, ...values }));
		if (!payload.length) return;

		const current_changed = !!changes[frm.doc.name];
		frappe.call({
			method: 'techner.techner.custom.job_applicant.update_applications',
			args: { changes: payload },
			freeze: true,
			freeze_message: __('Saving...'),
			btn: $save,
		}).then((r) => {
			frappe.show_alert({
				message: __('{0} application(s) updated', [(r.message || []).length]),
				indicator: 'green',
			});
			return frappe.call({
				method: 'techner.techner.custom.job_applicant.get_applications_by_email',
				args: { email: frm.doc.email_id },
			});
		}).then((r) => {
			applications = r.message || [];
			render();
			if (current_changed) {
				if (frm.is_dirty()) {
					frappe.show_alert({
						message: __('This record was updated from the popup, reload the form to see it'),
						indicator: 'orange',
					});
				} else {
					frm.reload_doc();
				}
			}
		});
	};

	$wrapper.on('click', '.ja-chip', function() {
		apply_filter($(this).attr('data-status'));
	});
	$wrapper.on('change', '.ja-status-select', function() {
		track_change($(this));
	});
	$wrapper.on('input', '.ja-notes-input', function() {
		track_change($(this));
	});
	$wrapper.on('click', '.ja-open', function() {
		const name = $(this).closest('.ja-row').attr('data-name');
		if (name !== frm.doc.name) {
			window.open(frappe.utils.get_form_link('Job Applicant', name), '_blank');
		}
	});

	render();
	d.show();
}

function color_of_status(status) {
	return INTERNAL_STATUS_COLORS[status] || INTERNAL_STATUS_COLORS[NOT_SET];
}

function get_applications_html(frm, applications, status_options) {
	const esc = frappe.utils.escape_html;
	const status_of = (d) => d.custom_internal_status || NOT_SET;
	const label_of = (status) => (status === NOT_SET ? __('Not Set') : __(status));

	// statuses in their Select order, only the ones present, "Not Set" last
	const counts = {};
	applications.forEach((d) => (counts[status_of(d)] = (counts[status_of(d)] || 0) + 1));
	const statuses = [
		...Object.keys(INTERNAL_STATUS_COLORS).filter((s) => s !== NOT_SET && counts[s]),
		...Object.keys(counts).filter((s) => !(s in INTERNAL_STATUS_COLORS)),
		...(counts[NOT_SET] ? [NOT_SET] : []),
	];

	const chip = (status, count) => {
		const color = status === 'all' ? 'var(--primary-color)' : color_of_status(status);
		return `
			<button type="button" class="ja-chip" data-status="${esc(status)}" style="--c: ${color}">
				${status === 'all' ? '' : '<span class="ja-dot"></span>'}
				${status === 'all' ? __('All') : esc(label_of(status))}
				<span class="ja-chip-count">${count}</span>
			</button>`;
	};

	const distribution = statuses.map((s) => `
		<span style="flex: ${counts[s]}; background: ${color_of_status(s)}"
			title="${esc(label_of(s))}: ${counts[s]}"></span>`).join('');

	const rows = applications.map((d, i) => {
		const status = status_of(d);
		const color = color_of_status(status);
		const is_current = d.name === frm.doc.name;

		// keep a status that isn't in the Select options anymore selectable
		const options = status_options.includes(d.custom_internal_status || '')
			? status_options
			: [...status_options, d.custom_internal_status];
		const select_options = options.map((o) => `
			<option value="${esc(o)}" ${o === (d.custom_internal_status || '') ? 'selected' : ''}>
				${o ? esc(__(o)) : esc(__('Not Set'))}
			</option>`).join('');

		return `
			<tr class="ja-row ${is_current ? 'ja-current' : ''}" data-name="${esc(d.name)}" data-status="${esc(status)}" style="--c: ${color}">
				<td class="ja-idx"><span>${applications.length - i}</span></td>
				<td>
					<div class="ja-title ${is_current ? '' : 'ja-open'}" title="${is_current ? '' : esc(__('Open in new tab'))}">
						${esc(d.custom_job_opening_title || d.job_title || __('Not set'))}
						${is_current ? '' : frappe.utils.icon('external-link', 'xs')}
					</div>
					<div class="ja-sub">
						${esc(d.name)}
						${is_current ? `<span class="ja-tag">${__('This record')}</span>` : ''}
						<span class="ja-edited">${__('Edited')}</span>
					</div>
				</td>
				<td>
					<div class="ja-status-wrap" style="--c: ${color}">
						<span class="ja-dot"></span>
						<select class="ja-status-select" data-field="custom_internal_status">${select_options}</select>
					</div>
				</td>
				<td>
					<textarea class="ja-notes-input" data-field="custom_applicant_notes" rows="2"
						placeholder="${esc(__('Add notes...'))}">${esc(d.custom_applicant_notes || '')}</textarea>
				</td>
				<td class="ja-date">
					<div class="ja-date-main">${frappe.utils.icon('calendar', 'xs')}<span>${frappe.datetime.str_to_user(d.creation.split(' ')[0])}</span></div>
					<div class="ja-sub">${comment_when(d.creation)}</div>
				</td>
			</tr>`;
	}).join('');

	return `
		<style>
			.ja-wrap { font-size: var(--text-base); }
			.ja-hero { position: relative; overflow: hidden; display: flex; align-items: center; gap: 16px;
				padding: 20px 22px; border-radius: 14px; color: #fff;
				background: linear-gradient(120deg, #4f46e5 0%, #7c3aed 45%, #db2777 100%); }
			.ja-hero::after { content: ''; position: absolute; right: -40px; top: -60px; width: 200px; height: 200px;
				border-radius: 50%; background: rgba(255,255,255,.12); }
			.ja-avatar { width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center;
				justify-content: center; font-weight: 700; font-size: 20px; flex-shrink: 0;
				background: rgba(255,255,255,.22); border: 2px solid rgba(255,255,255,.55); }
			.ja-name { font-weight: 700; font-size: 18px; }
			.ja-email { opacity: .85; margin-top: 2px; }
			.ja-total { position: relative; z-index: 1; margin-left: auto; text-align: center; padding: 8px 18px;
				border-radius: 12px; background: rgba(255,255,255,.18); backdrop-filter: blur(4px); }
			.ja-total b { display: block; font-size: 28px; line-height: 1.1; }
			.ja-total span { font-size: 12px; opacity: .9; text-transform: uppercase; letter-spacing: .05em; }
			.ja-bar { display: flex; height: 8px; border-radius: 8px; overflow: hidden; margin: 16px 0 12px;
				background: var(--control-bg); gap: 2px; }
			.ja-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
			.ja-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px;
				font-size: var(--text-sm); font-weight: 500; cursor: pointer; transition: all .15s;
				color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent);
				border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); }
			.ja-chip:hover { background: color-mix(in srgb, var(--c) 22%, transparent); }
			.ja-chip.active { color: #fff; background: var(--c); border-color: var(--c);
				box-shadow: 0 3px 10px color-mix(in srgb, var(--c) 40%, transparent); }
			.ja-chip-count { min-width: 20px; padding: 0 6px; border-radius: 10px; font-size: 11px; font-weight: 700;
				text-align: center; background: color-mix(in srgb, var(--c) 18%, transparent); }
			.ja-chip.active .ja-chip-count { background: rgba(255,255,255,.28); }
			.ja-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); flex-shrink: 0; }
			.ja-chip.active .ja-dot { background: #fff; }
			.ja-showing { margin-left: auto; align-self: center; font-size: var(--text-sm); color: var(--text-muted); }
			.ja-table-wrap { max-height: 55vh; overflow: auto; border: 1px solid var(--border-color); border-radius: 12px; }
			.ja-table { width: 100%; margin: 0; border-collapse: collapse; }
			.ja-table th { position: sticky; top: 0; z-index: 1; background: var(--subtle-fg); color: var(--text-muted);
				font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
				padding: 11px 14px; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
			.ja-table td { padding: 13px 14px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
			.ja-table tr:last-child td { border-bottom: none; }
			.ja-row { transition: background .15s; box-shadow: inset 4px 0 0 var(--c); }
			.ja-row:hover { background: color-mix(in srgb, var(--c) 5%, transparent); }
			.ja-current { background: color-mix(in srgb, var(--primary-color) 8%, transparent); }
			.ja-dirty, .ja-dirty:hover { background: color-mix(in srgb, #f59e0b 12%, transparent); }
			.ja-edited { display: none; margin-left: 6px; padding: 1px 8px; border-radius: 10px; font-size: 11px;
				font-weight: 600; color: #fff; background: #f59e0b; }
			.ja-dirty .ja-edited { display: inline-block; }
			.ja-idx span { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px;
				border-radius: 50%; font-size: 12px; font-weight: 700; color: var(--c);
				background: color-mix(in srgb, var(--c) 14%, transparent); }
			.ja-title { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: var(--heading-color); }
			.ja-open { cursor: pointer; }
			.ja-open:hover { color: var(--primary-color); text-decoration: underline; }
			.ja-open svg { opacity: .55; }
			.ja-sub { font-size: var(--text-sm); color: var(--text-muted); margin-top: 3px; }
			.ja-tag { margin-left: 6px; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;
				color: #fff; background: linear-gradient(90deg, #4f46e5, #db2777); }
			.ja-status-wrap { display: inline-flex; align-items: center; gap: 6px; padding: 0 4px 0 10px;
				border-radius: 20px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
				border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
			.ja-status-select { border: none; background: transparent; color: inherit; font-weight: 600;
				font-size: var(--text-sm); padding: 4px 2px; cursor: pointer; outline: none; }
			.ja-status-select option { color: var(--text-color); background: var(--modal-bg, var(--card-bg)); }
			.ja-notes-input { width: 100%; min-width: 200px; max-width: 340px; min-height: 38px; resize: vertical;
				padding: 6px 10px; border-radius: 8px; border: 1px solid transparent; background: var(--control-bg);
				color: var(--text-color); font-size: var(--text-base); line-height: 1.4; transition: border-color .15s; }
			.ja-notes-input:focus { outline: none; border-color: var(--primary-color);
				box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 20%, transparent); }
			.ja-table th:last-child, .ja-date { width: 1%; white-space: nowrap; text-align: left; }
			.ja-date-main { display: inline-flex; align-items: center; justify-content: flex-start; gap: 6px;
				font-weight: 500; color: var(--text-color); }
			.ja-date-main svg { flex-shrink: 0; margin: 0; }
			.ja-hint { margin-top: 10px; font-size: var(--text-sm); color: var(--text-muted); }
		</style>
		<div class="ja-wrap">
			<div class="ja-hero">
				<div class="ja-avatar">${esc(frappe.get_abbr(frm.doc.applicant_name || frm.doc.email_id))}</div>
				<div>
					<div class="ja-name">${esc(frm.doc.applicant_name || '')}</div>
					<div class="ja-email">${esc(frm.doc.email_id)}</div>
				</div>
				<div class="ja-total">
					<b>${applications.length}</b>
					<span>${applications.length === 1 ? __('Application') : __('Applications')}</span>
				</div>
			</div>
			<div class="ja-bar">${distribution}</div>
			<div class="ja-chips">
				${chip('all', applications.length)}
				${statuses.map((s) => chip(s, counts[s])).join('')}
				<span class="ja-showing"></span>
			</div>
			<div class="ja-table-wrap">
				<table class="ja-table">
					<thead>
						<tr>
							<th>#</th>
							<th>${__('Job Opening Title')}</th>
							<th>${__('Internal Status')}</th>
							<th>${__('Applicant Notes')}</th>
							<th>${__('Date of Application Received')}</th>
						</tr>
					</thead>
					<tbody>${rows}</tbody>
				</table>
			</div>
			<div class="ja-hint">${__('Change Internal Status or Notes and click Save. Click a job title to open that application in a new tab.')}</div>
		</div>`;
}
