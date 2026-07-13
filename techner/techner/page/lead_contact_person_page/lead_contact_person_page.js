frappe.pages['lead-contact-person-page'].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __('Lead Contacts'),
		single_column: true
	});

	// ── Filters ────────────────────────────────────────────────────────────
	const btn_filter = page.add_button(__('Filter'), () => { }, { icon: 'filter' });

	let filter_group;
	frappe.model.with_doctype('Lead Contact Person', () => {
		filter_group = new frappe.ui.FilterGroup({
			parent: page.wrapper,
			doctype: 'Lead Contact Person',
			filter_button: btn_filter,
			default_filters: [],
			on_change: () => refresh()
		});
	});
const contact_person_filter = page.add_field({
	label: __("Lead Contact Person"),
	fieldname: "name",
	fieldtype: "Link",
	options: "Lead Contact Person",
	change: refresh
});

const email_filter = page.add_field({
	label: __("Email"),
	fieldname: "contact_person_email",
	fieldtype: "Data",
	change: refresh
});

const company_filter = page.add_field({
	label: __("Company"),
	fieldname: "crm_leads",
	fieldtype: "Link",
	options: "CRM Leads",
	change: refresh
});

const connection_filter = page.add_field({
	label: __("Connection"),
	fieldname: "connection_request",
	fieldtype: "Select",
	options: "\nNot Connected\nRequested\nConnected",
	change: refresh
});
	page.set_primary_action(__('+ Add Contact'), () => frappe.new_doc('Lead Contact Person'));
	page.add_button(__('Refresh'), refresh, { icon: 'refresh' });

	page.main.append(`
		<div id="lcp-root" style="padding:16px 20px;">
			<div id="lcp-stats" style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:20px;"></div>
			<div id="lcp-table-wrap"></div>
		</div>
	`);

	// inject CSS once
	frappe.dom.set_style(`
		#lcp-root { font-family: 'Inter', system-ui, sans-serif; }

		/* ── Stats Cards ── */
		.lcp-card {
			flex: 1 1 160px;
			border-radius: 14px;
			padding: 18px 20px;
			color: #fff;
			position: relative;
			overflow: hidden;
			min-width: 150px;
			box-shadow: 0 4px 18px rgba(0,0,0,.12);
		}
		.lcp-card::after {
			content: '';
			position: absolute;
			right: -20px; top: -20px;
			width: 100px; height: 100px;
			border-radius: 50%;
			background: rgba(255,255,255,.12);
		}
		.lcp-card-label { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; opacity: .85; }
		.lcp-card-value { font-size: 34px; font-weight: 800; line-height: 1.1; margin-top: 4px; }
		.lcp-card-sub   { font-size: 11px; opacity: .75; margin-top: 2px; }

		/* ── Table ── */
		.lcp-scroll { overflow-x: auto; overflow-y: auto; max-height: calc(100vh - 230px); border-radius: 12px; border: 1px solid #dde3ee; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
		.lcp-tbl { width: 100%; border-collapse: collapse; font-size: 11px; }

		/* group header */
		.lcp-tbl thead tr.grp th { padding: 6px 10px; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #fff; text-align: center; position: sticky; top: 0px; z-index:3; }
		.lcp-tbl thead tr.grp th.g-contact { background: #4F46E5; }
		.lcp-tbl thead tr.grp th.g-comm    { background: #0891B2; }
		.lcp-tbl thead tr.grp th.g-conn    { background: #7C3AED; }

		/* field header */
		.lcp-tbl thead tr.fld th { padding: 7px 10px; font-size: 11px; font-weight: 600; color: #e2e8f0; white-space: nowrap; position: sticky; top: 29px; z-index: 2; border-bottom: 2px solid rgba(255,255,255,.15); border-right: 1px solid rgba(255,255,255,.1); }
		.lcp-tbl thead tr.fld th.h-contact { background: #4338CA; }
		.lcp-tbl thead tr.fld th.h-comm    { background: #0E7490; }
		.lcp-tbl thead tr.fld th.h-conn    { background: #6D28D9; }

		/* body */
		.lcp-tbl tbody tr:nth-child(odd)  { background: #ffffff; }
		.lcp-tbl tbody tr:nth-child(even) { background: #f8fafc; }
		.lcp-tbl tbody tr:hover           { background: #EEF2FF; transition: background .12s; }
		.lcp-tbl tbody td { padding: 0; border-right: 1px solid #e4eaf3; border-bottom: 1px solid #e4eaf3; vertical-align: middle; }
		.lcp-tbl tbody td:last-child { border-right: none; }

		/* avatar cell */
		.lcp-avatar-cell { display: flex; align-items: center; gap: 6px; padding: 4px 6px; }
		.lcp-avatar { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 500; color: #fff; flex-shrink: 0; }
		.lcp-name   { font-weight: 400; font-size: 11px; color: #1e293b; line-height: 1.2; }
		.lcp-desig  { font-size: 10px; color: #64748b; }
		.lcp-row-num { padding: 4px 6px; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 400; }

		/* date pill */
		.lcp-date { display: inline-flex; align-items: center; gap: 4px; background: #EFF6FF; color: #1D4ED8; font-size: 10px; font-weight: 400; padding: 2px 5px; border-radius: 20px; white-space: nowrap; }
		.lcp-date svg { width: 10px; height: 10px; flex-shrink: 0; }
		td.col-date { padding: 4px 6px; text-align: center; }
		.lcp-dash { color: #cbd5e1; font-size: 14px; }

		/* connection badge */
		.lcp-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 20px; font-size: 10px; font-weight: 400; }
		.lcp-badge.connected    { background: #DCFCE7; color: #15803D; }
		.lcp-badge.requested    { background: #FEF9C3; color: #92400E; }
		.lcp-badge.not-connected{ background: #F1F5F9; color: #475569; }
		.lcp-badge .dot         { width: 6px; height: 6px; border-radius: 50%; }
		.connected .dot  { background: #16A34A; }
		.requested .dot  { background: #D97706; }
		.not-connected .dot { background: #94A3B8; }
		td.col-badge { padding: 4px 6px; text-align: center; }

		/* linkedin button */
		.lcp-li-btn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; background: #0A66C2; color: #fff; text-decoration: none; transition: transform .15s, box-shadow .15s; }
		.lcp-li-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(10,102,194,.4); }
		td.col-li { padding: 4px 6px; text-align: center; }

		/* inline edit */
		.lcp-cell-wrap { position: relative; }
		.lcp-display { display: block; padding: 4px 6px; font-size: 10px; color: #1e293b; cursor: text; min-height: 20px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
		.lcp-display:hover { background: rgba(79,70,229,.06); }
		.lcp-display.empty { color: #cbd5e1; font-style: italic; }
		.lcp-editor { display: none; }
		.td-editing .lcp-display { display: none; }
		.td-editing .lcp-editor  { display: block; }
		.lcp-ta { width: 100%; min-height: 24px; padding: 4px 6px; font-size: 11px; color: #1e293b; background: #fff; border: none; outline: none; font-family: inherit; resize: vertical; box-shadow: inset 0 0 0 2px #4F46E5; box-sizing: border-box; }
		.lcp-inp { width: 100%; height: 24px; padding: 0 6px; font-size: 11px; color: #1e293b; background: #fff; border: none; outline: none; font-family: inherit; box-shadow: inset 0 0 0 2px #4F46E5; box-sizing: border-box; }
		.lcp-sel { width: 100%; height: 24px; padding: 0 6px; font-size: 11px; background: #fff; border: none; outline: none; font-family: inherit; box-shadow: inset 0 0 0 2px #4F46E5; box-sizing: border-box; cursor: pointer; }

		/* footer */
		.lcp-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 4px; color: #64748b; font-size: 12px; }
		.lcp-empty { text-align: center; padding: 60px; color: #94a3b8; font-size: 15px; }
	`);

	// ── Avatar colors ──────────────────────────────────────────────────────
	const AVATAR_COLORS = [
		'#4F46E5', '#0891B2', '#7C3AED', '#D97706', '#059669',
		'#DC2626', '#DB2777', '#2563EB', '#16A34A', '#9333EA'
	];

	function avatarColor(name) {
		let h = 0;
		for (let c of (name || 'X')) h = (h << 5) - h + c.charCodeAt(0);
		return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
	}

	function initials(name) {
		return (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
	}

	// ── Date pill ──────────────────────────────────────────────────────────
	const CAL_ICON = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 1v1H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-2V1h-1v1H5V1H4zm0 2h8v1H4V3zM2 5h12v8H2V5z"/></svg>`;
	function datePill(val) {
		if (!val) return `<span class="lcp-dash">—</span>`;
		const d = frappe.datetime.str_to_user(val) || val;
		return `<span class="lcp-date">${CAL_ICON}${d}</span>`;
	}

	// ── Connection badge ───────────────────────────────────────────────────
	function connBadge(val) {
		if (!val) return `<span class="lcp-dash">—</span>`;
		const cls = val === 'Connected' ? 'connected' : val === 'Requested' ? 'requested' : 'not-connected';
		return `<span class="lcp-badge ${cls}"><span class="dot"></span>${val}</span>`;
	}

	// ── LinkedIn button ────────────────────────────────────────────────────
	const LI_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;

	// ── Main data ──────────────────────────────────────────────────────────
	let currentData = [];

	// function getFilters() {
	// 	return filter_group ? filter_group.get_filters() : [];
	// }
function getFilters() {
	let filters = [];

	if (contact_person_filter.get_value()) {
		filters.push([
			"Lead Contact Person",
			"name",
			"like",
			`%${contact_person_filter.get_value()}%`
		]);
	}

	if (email_filter.get_value()) {
		filters.push([
			"Lead Contact Person",
			"contact_person_email",
			"like",
			`%${email_filter.get_value()}%`
		]);
	}

	if (company_filter.get_value()) {
		filters.push([
			"Lead Contact Person",
			"crm_leads",
			"=",
			company_filter.get_value()
		]);
	}

	if (connection_filter.get_value()) {
		filters.push([
			"Lead Contact Person",
			"connection_request",
			"=",
			connection_filter.get_value()
		]);
	}

	// Existing FilterGroup filters bhi sath rahenge
	if (filter_group) {
		filters = filters.concat(filter_group.get_filters());
	}

	return filters;
}
	function refresh() {
		$('#lcp-table-wrap').html(`<div class="lcp-empty">Loading…</div>`);
		frappe.call({
			method: 'techner.techner.page.lead_contact_person_page.lead_contact_person_page.get_page_data',
			args: { filters: getFilters() },
			callback(r) {
				if (!r.message) return;
				currentData = r.message.data || [];
				renderStats(r.message.stats || {});
				renderTable(currentData);
			}
		});
	}

	// ── Stats cards ────────────────────────────────────────────────────────
	const CARDS = [
		{ key: 'companies', label: 'Companies', sub: 'Unique companies', grad: 'linear-gradient(135deg,#7C3AED,#A855F7)' },
		{ key: 'total', label: 'Total Contacts', sub: 'All records', grad: 'linear-gradient(135deg,#4F46E5,#7C3AED)' },
		{ key: 'contacted', label: 'Total Email Sent', sub: 'Email sent', grad: 'linear-gradient(135deg,#0891B2,#06B6D4)' },
		// { key: 'connected', label: 'Connected', sub: 'LinkedIn connected', grad: 'linear-gradient(135deg,#059669,#10B981)' },
		{ key: 'requested', label: 'Requested', sub: 'Pending connection', grad: 'linear-gradient(135deg,#D97706,#F59E0B)' },
		{ key: 'message_sent', label: 'Total Messages Sent', sub: 'Messages sent', grad: 'linear-gradient(135deg,#D97706,#F59E0B)'},
		
		
	];

	function renderStats(stats) {
		$('#lcp-stats').html(CARDS.map(c => `
			<div class="lcp-card" style="background:${c.grad};">
				<div class="lcp-card-label">${c.label}</div>
				<div class="lcp-card-value">${stats[c.key] ?? 0}</div>
				<div class="lcp-card-sub">${c.sub}</div>
			</div>
		`).join(''));
	}

	// ── Table ──────────────────────────────────────────────────────────────
	function renderTable(data) {
		if (!data.length) {
			$('#lcp-table-wrap').html(`<div class="lcp-empty">No contacts found.</div>`);
			return;
		}

		const rows = data.map((row, i) => {
			const color = avatarColor(row.contact_person_name);
			const init = initials(row.contact_person_name);
			const name = frappe.utils.escape_html(row.contact_person_name || '');
			const desig = frappe.utils.escape_html(row.designation || '');
			const company = frappe.utils.escape_html(row.crm_leads || '');
			const email = frappe.utils.escape_html(row.contact_person_email || '');

			// editable text cell helper
			// function editCell(field, val, type = 'text') {
			// 	const esc = frappe.utils.escape_html(val || '');
			// 	const empty = !val ? 'empty' : '';
			// 	const editor = type === 'select'
			// 		? `<select class="lcp-sel lcp-sel-input" data-doc="${row.name}" data-field="${field}">
			// 				<option value=""></option>
			// 				${['Not Connected', 'Requested', 'Connected'].map(o =>
			// 			`<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`
			// 		).join('')}
			// 			</select>`
			// 		: type === 'date'
			// 			? `<input class="lcp-inp lcp-date-input" type="date" data-doc="${row.name}" data-field="${field}" value="${val || ''}">`
			// 			: `<textarea class="lcp-ta lcp-ta-input" data-doc="${row.name}" data-field="${field}">${esc}</textarea>`;
			// 	return `
			// 		<div class="lcp-cell-wrap">
			// 			<span class="lcp-display ${empty}" data-type="${type}">${esc || '—'}</span>
			// 			<div class="lcp-editor">${editor}</div>
			// 		</div>`;
			// }

			function editCell(field, val, type = 'text') {
				const esc = frappe.utils.escape_html(val || '');
				const empty = !val ? 'empty' : '';

				// display content depends on type
				let displayHtml;
				if (type === 'date') {
					displayHtml = val ? datePill(val) : '<span class="lcp-dash">—</span>';
				} else {
					displayHtml = esc || '—';
				}

				const editor = type === 'select'
					? `<select class="lcp-sel lcp-sel-input" data-doc="${row.name}" data-field="${field}">
							<option value=""></option>
							${['Not Connected', 'Requested', 'Connected'].map(o =>
						`<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`
					).join('')}
						</select>`
					: type === 'date'
						? `<input class="lcp-inp lcp-date-input" type="date" data-doc="${row.name}" data-field="${field}" value="${val || ''}">`
						: `<textarea class="lcp-ta lcp-ta-input" data-doc="${row.name}" data-field="${field}">${esc}</textarea>`;
				return `
					<div class="lcp-cell-wrap">
						<span class="lcp-display ${empty}" data-type="${type}">${displayHtml}</span>
						<div class="lcp-editor">${editor}</div>
					</div>`;
			}

			const liHtml = row.linkedin_link
				? `<a href="${row.linkedin_link}" target="_blank" class="lcp-li-btn" title="Open LinkedIn">${LI_ICON}</a>`
				: `<span class="lcp-dash">—</span>`;

			return `
			<tr>
				<td class="lcp-row-num">${i + 1}</td>
				<td>
					<div class="lcp-avatar-cell">
						<div class="lcp-avatar" style="background:${color}">${init}</div>
						<div>
							<a href="/app/lead-contact-person/${row.name}" class="lcp-name">${name}</a>
							<div class="lcp-desig">${desig}</div>
							<div style="font-size:10px;color:#64748b;margin-top:2px;">
								${email || '<span class="lcp-dash">—</span>'}
							</div>
						</div>
					</div>
				</td>
		


				<td style="padding:4px 6px;font-size:11px;color:#334155;min-width:80px;">
					${company ? `<a href="/app/crm-leads/${row.crm_leads}" style="color:#4F46E5;text-decoration:none;font-weight:400;">${company}</a>` : '<span class="lcp-dash">—</span>'}
				</td>


				<td class="col-date" data-doc="${row.name}" data-field="first_email" data-type="date">
					${editCell('first_email', row.first_email, 'date')}
				</td>
				<td class="col-date" data-doc="${row.name}" data-field="second_email" data-type="date">
					${editCell('second_email', row.second_email, 'date')}
				</td>
				<td class="col-date" data-doc="${row.name}" data-field="third_email" data-type="date">
					${editCell('third_email', row.third_email, 'date')}
				</td>				
				


				<td style="min-width:400px; max-width:1000px;" data-doc="${row.name}" data-field="remarks" data-type="text">
					${editCell('remarks', row.remarks)}
				</td>
				<td style="min-width:200px; max-width:250px;" data-doc="${row.name}" data-field="notes" data-type="text">
					${editCell('notes', row.notes)}
				</td>
				<td class="col-li">${liHtml}</td>
				<td class="col-badge" data-doc="${row.name}" data-field="connection_request" data-type="select">
					${editCell('connection_request', row.connection_request, 'select')}
				</td>

				<td class="col-date" data-doc="${row.name}" data-field="first_message" data-type="date">
					${editCell('first_message', row.first_message, 'date')}
				</td>
				<td class="col-date" data-doc="${row.name}" data-field="second_message" data-type="date">
					${editCell('second_message', row.second_message, 'date')}
				</td>				


			</tr>`;
		}).join('');

		$('#lcp-table-wrap').html(`
			<div class="lcp-scroll">
				<table class="lcp-tbl">
					<thead>
						<tr class="grp">
							<th class="g-contact" colspan="4">Contact Information</th>
							<th class="g-comm"    colspan="5">Communication Details</th>
							<th class="g-conn"    colspan="4">Connection &amp; Message</th>
						</tr>
						<tr class="fld">
							<th class="h-contact" style="min-width:40px;width:40px;">#</th>
							<th class="h-contact" style="min-width:210px;">Contact Person</th>
							
							<th class="h-contact" style="min-width:80px;">Company</th>
							<th class="h-comm"    style="min-width:80px;">1st Email</th>
							<th class="h-comm"    style="min-width:80px;">2nd Email</th>
							<th class="h-comm"    style="min-width:80px;">3rd Email</th>
							<th class="h-comm"    style="min-width:200px;">Remarks</th>
							<th class="h-comm"    style="min-width:200px;">Notes</th>
							<th class="h-conn"    style="min-width:60px;">LinkedIn</th>
							<th class="h-conn"    style="min-width:100px;">Connection</th>
							<th class="h-conn"    style="min-width:100px;">1st Message</th>
							<th class="h-conn"    style="min-width:100px;">2nd Message</th>
						</tr>
					</thead>
					<tbody>${rows}</tbody>
				</table>
			</div>
			<div class="lcp-footer">
				<span>Showing <strong>${data.length}</strong> record${data.length !== 1 ? 's' : ''}</span>
			</div>
		`);

		bindEvents();
	}

	// ── Inline edit events ─────────────────────────────────────────────────
	function bindEvents() {
		// click display → enter edit
		$(document).off('click.lcp').on('click.lcp', '.lcp-display', function () {
			const $td = $(this).closest('td');
			$td.addClass('td-editing');
			const type = $td.data('type');
			if (type === 'select') {
				$td.find('.lcp-sel').focus();
			} else if (type === 'date') {
				$td.find('.lcp-date-input').focus();
			} else {
				const $ta = $td.find('.lcp-ta');
				autoH($ta[0]);
				$ta.focus();
			}
		});

		// select change → save + exit
		$('.lcp-sel-input').off('change.lcp').on('change.lcp', function () {
			const $el = $(this), val = $el.val();
			const $td = $el.closest('td');
			save($el.data('doc'), $el.data('field'), val);
			// re-render badge in display span
			$td.find('.lcp-display').html(connBadge(val)).removeClass('empty');
			$td.removeClass('td-editing');
		});

		// textarea blur → save + exit
		$('.lcp-ta-input').off('blur.lcp').on('blur.lcp', function () {
			const $el = $(this), val = $el.val();
			const $td = $el.closest('td');
			save($el.data('doc'), $el.data('field'), val);
			const $disp = $td.find('.lcp-display');
			$disp.text(val || '—').toggleClass('empty', !val);
			$td.removeClass('td-editing');
		}).off('input.lcp').on('input.lcp', function () { autoH(this); });

		// date input change → save + exit
		// $('.lcp-date-input').off('change.lcp').on('change.lcp', function () {
		// 	const $el = $(this), val = $el.val();
		// 	const $td = $el.closest('td');
		// 	save($el.data('doc'), $el.data('field'), val);
		// 	$td.removeClass('td-editing');
		// });
		// date input change → save + exit
		$('.lcp-date-input').off('change.lcp').on('change.lcp', function () {
			const $el = $(this), val = $el.val();
			const $td = $el.closest('td');
			save($el.data('doc'), $el.data('field'), val);
			const $disp = $td.find('.lcp-display');
			$disp.html(val ? datePill(val) : '<span class="lcp-dash">—</span>').toggleClass('empty', !val);
			$td.removeClass('td-editing');
		});
		// Escape to cancel
		$(document).off('keydown.lcp').on('keydown.lcp', '.td-editing textarea, .td-editing select, .td-editing input', function (e) {
			if (e.key === 'Escape') $(this).closest('td').removeClass('td-editing');
		});
	}

	function autoH(el) {
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = Math.max(38, el.scrollHeight) + 'px';
	}

	function save(docname, field, value) {
		frappe.call({
			method: 'techner.techner.page.lead_contact_person_page.lead_contact_person_page.update_field',
			args: { docname, field, value },
			callback(r) {
				if (r.exc) frappe.msgprint(__('Save failed. Please try again.'));
			}
		});
	}

	// Initial load
	refresh();
};
