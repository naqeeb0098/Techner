frappe.pages['applicant-tracker-re'].on_page_load = function(wrapper) {

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Applicant Tracker Report',
        single_column: true
    });

    $(page.body).html(`
        <div class="applicant-wrapper">

            <!-- FILTER BAR -->
            <div class="filter-bar">

                <div class="filter-item">
                    <label>Applicant Name</label>
                    <input type="text" id="applicant_name">
                </div>

                <div class="filter-item">
                    <label>Job Applicant</label>
                    <select id="job_applicant"></select>
                </div>

                <div class="filter-item">
                    <label>Job Opening</label>
                    <select id="job_opening"></select>
                </div>

                <div class="filter-item">
                    <label>Source</label>
                    <select id="source"></select>
                </div>

                <div class="filter-item">
                    <label>From Date</label>
                    <input type="date" id="from_date">
                </div>

                <div class="filter-item">
                    <label>To Date</label>
                    <input type="date" id="to_date">
                </div>

            </div>

            <!-- TABLE -->
            <div class="table-container">
                <table class="table table-hover applicant-table">
                    <thead>
                        <tr id="header_row"></tr>
                    </thead>
                    <tbody id="data_body"></tbody>
                </table>
            </div>

        </div>
    `);

    load_filters();
    load_data();
    bind_filters();
};


/* ================= LIVE FILTER ================= */
let timer = null;

function bind_filters() {
    $("#applicant_name, #job_applicant, #job_opening, #source, #from_date, #to_date")
    .on("input change", function () {

        clearTimeout(timer);
        timer = setTimeout(() => load_data(), 300);

    });
}


/* ================= FILTER OPTIONS ================= */

function load_filters() {

    let maps = {
        job_applicant: "Job Applicant",
        job_opening: "Job Opening",
        source: "Job Applicant Source"
    };

    Object.keys(maps).forEach(field => {

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: maps[field],
                fields: ["name"],
                limit_page_length: 1000
            },
            callback: function(r) {

                let html = `<option value="">Select</option>`;

                (r.message || []).forEach(d => {
                    html += `<option value="${d.name}">${d.name}</option>`;
                });

                $("#" + field).html(html);
            }
        });
    });
}


/* ================= LOAD DATA ================= */

function load_data() {

    frappe.call({
        method: "techner.techner.page.applicant_tracker_re.applicant_tracker_re.get_applicant_tracker_report",
        args: {
            applicant_name: $("#applicant_name").val(),
            job_applicant: $("#job_applicant").val(),
            job_opening: $("#job_opening").val(),
            job_applicant_source: $("#source").val(),
            from_date: $("#from_date").val(),
            to_date: $("#to_date").val()
        },
        callback: function(r) {
            if (r.message && r.message.status === "success") {
                render_table(r.message.data);
            }
        }
    });
}


/* ================= TABLE ================= */

function render_table(data) {

    if (!data || !data.length) return;

    let fields = Object.keys(data[0]);

    let header = "";
    fields.forEach(f => header += `<th>${to_title(f)}</th>`);
    $("#header_row").html(header);

    let body = "";

    data.forEach(row => {

        body += `<tr data-name="${row.name}">`;

        fields.forEach(f => {

            let val = row[f] || "";

            if (is_link_field(f)) {

                body += `
                    <td>
                        <select data-field="${f}" data-name="${row.name}"
                            onchange="update_field(this)">
                            <option>${val}</option>
                        </select>
                    </td>
                `;

                load_link_options(f, val);
            }

            else if (typeof val === "string" && val.length > 80) {

                body += `
                    <td onclick="show_detail('${f}', \`${encodeURIComponent(val)}\`)">
                        ${val.substring(0, 80)}...
                    </td>
                `;
            }

            else {

                body += `
                    <td>
                        <input value="${val}"
                            data-field="${f}"
                            data-name="${row.name}"
                            onblur="update_field(this)">
                    </td>
                `;
            }

        });

        body += "</tr>";
    });

    $("#data_body").html(body);
}


/* ================= LINK FIELD ================= */

function is_link_field(f) {

    return ["job_applicant", "job_opening", "job_applicant_source"].includes(f);
}

function load_link_options(field, selected) {

    let map = {
        job_applicant: "Job Applicant",
        job_opening: "Job Opening",
        job_applicant_source: "Job Applicant Source"
    };

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: map[field],
            fields: ["name"],
            limit_page_length: 1000
        },
        callback: function(r) {

            let html = `<option value="">Select</option>`;

            (r.message || []).forEach(d => {
                let sel = d.name === selected ? "selected" : "";
                html += `<option value="${d.name}" ${sel}>${d.name}</option>`;
            });

            $(`[data-field="${field}"]`).html(html);
        }
    });
}


/* ================= UPDATE DB ================= */

function update_field(el) {

    frappe.call({
        method: "frappe.client.set_value",
        args: {
            doctype: "Applicant Tracker",
            name: $(el).data("name"),
            fieldname: $(el).data("field"),
            value: $(el).val()
        },
        callback: function() {
            frappe.show_alert({message:"Updated", indicator:"green"});
        }
    });
}


/* ================= POPUP ================= */

function show_detail(field, value) {

    let d = new frappe.ui.Dialog({
        title: to_title(field),
        size: "large",
        fields: [{fieldtype:"HTML"}]
    });

    d.fields_dict.html.$wrapper.html(`
        <div style="padding:10px;white-space:pre-wrap;">
            ${decodeURIComponent(value)}
        </div>
    `);

    d.show();
}


/* ================= TITLE ================= */

function to_title(f) {
    return f.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}


// ============================================now editable above====================================

// frappe.pages['applicant-tracker-re'].on_page_load = function(wrapper) {

//     let page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'Applicant Tracker Report',
//         single_column: true
//     });

//     $(page.body).html(`
//         <div class="applicant-wrapper">

//             <!-- ================= FILTER BAR ================= -->
// 			<div class="filter-bar">

// 				<!-- Applicant Name -->
// 				<div class="filter-item">
// 					<label>Applicant Name</label>
// 					<input type="text" id="applicant_name" placeholder="Search applicant...">
// 				</div>

// 				<!-- Job Applicant -->
// 				<div class="filter-item">
// 					<label>Job Applicant</label>
// 					<select id="job_applicant"></select>
// 				</div>

// 				<!-- Job Opening -->
// 				<div class="filter-item">
// 					<label>Job Opening</label>
// 					<select id="job_opening"></select>
// 				</div>

// 				<!-- Source -->
// 				<div class="filter-item">
// 					<label>Source</label>
// 					<select id="source"></select>
// 				</div>

// 				<!-- From Date -->
// 				<div class="filter-item">
// 					<label>From Date</label>
// 					<input type="date" id="from_date">
// 				</div>

// 				<!-- To Date -->
// 				<div class="filter-item">
// 					<label>To Date</label>
// 					<input type="date" id="to_date">
// 				</div>

// 			</div>

//             <!-- ================= TABLE ================= -->
//             <div class="table-container">
//                 <table class="table table-hover applicant-table">
//                     <thead>
//                         <tr id="header_row"></tr>
//                     </thead>
//                     <tbody id="data_body"></tbody>
//                 </table>
//             </div>

//         </div>
//     `);

//     load_filters();
//     load_data();
//     bind_filters();
// };


// /* ===================== DEBOUNCE ===================== */
// let timer = null;


// /* ===================== LIVE FILTER BIND ===================== */

// function bind_filters() {

//     $("#applicant_name, #job_applicant, #job_opening, #source, #from_date, #to_date")
//     .on("input change", function () {

//         clearTimeout(timer);

//         timer = setTimeout(function () {
//             load_data();
//         }, 400);

//     });
// }


// /* ===================== LOAD FILTER OPTIONS ===================== */

// function load_filters() {

//     // Job Applicant
//     frappe.call({
//         method: "frappe.client.get_list",
//         args: {
//             doctype: "Job Applicant",
//             fields: ["name"],
//             limit_page_length: 1000
//         },
//         callback: function(r) {
//             fill_dropdown("#job_applicant", r.message);
//         }
//     });

//     // Job Opening
//     frappe.call({
//         method: "frappe.client.get_list",
//         args: {
//             doctype: "Job Opening",
//             fields: ["name"],
//             limit_page_length: 1000
//         },
//         callback: function(r) {
//             fill_dropdown("#job_opening", r.message);
//         }
//     });

//     // Source
//     frappe.call({
//         method: "frappe.client.get_list",
//         args: {
//             doctype: "Job Applicant Source",
//             fields: ["name"],
//             limit_page_length: 1000
//         },
//         callback: function(r) {
//             fill_dropdown("#source", r.message);
//         }
//     });
// }


// /* ===================== FILL DROPDOWN ===================== */

// function fill_dropdown(selector, data) {

//     let html = `<option value="">Select</option>`;

//     (data || []).forEach(d => {
//         html += `<option value="${d.name}">${d.name}</option>`;
//     });

//     $(selector).html(html);
// }


// /* ===================== LOAD DATA ===================== */

// function load_data() {

//     frappe.call({
//         method: "techner.techner.page.applicant_tracker_re.applicant_tracker_re.get_applicant_tracker_report",
//         args: {
//             applicant_name: $("#applicant_name").val(),
//             job_applicant: $("#job_applicant").val(),
//             job_opening: $("#job_opening").val(),
//             job_applicant_source: $("#source").val(),
//             from_date: $("#from_date").val(),
//             to_date: $("#to_date").val()
//         },
//         callback: function(r) {

//             if (r.message && r.message.status === "success") {
//                 render_table(r.message.data);
//             }

//         }
//     });
// }


// /* ===================== RESET ===================== */

// function reset_filters() {

//     $("#applicant_name").val("");
//     $("#job_applicant").val("");
//     $("#job_opening").val("");
//     $("#source").val("");
//     $("#from_date").val("");
//     $("#to_date").val("");

//     load_data();
// }


// /* ===================== TABLE RENDER ===================== */

// function render_table(data) {

//     if (!data || !data.length) {
//         $("#data_body").html("<tr><td>No Data Found</td></tr>");
//         return;
//     }

//     let fields = Object.keys(data[0]);

//     /* HEADER */
//     let header_html = "";
//     fields.forEach(f => {
//         header_html += `<th>${to_title(f)}</th>`;
//     });
//     $("#header_row").html(header_html);

//     /* BODY */
//     let body_html = "";

//     data.forEach(row => {

//         body_html += "<tr>";

//         fields.forEach(f => {

//             let val = row[f] || "";
//             let shortVal = val;

//             if (typeof val === "string" && val.length > 60) {
//                 shortVal = val.substring(0, 60) + "...";
//             }

//             let is_clickable = is_text_field(val);

//             if (is_clickable) {

//                 body_html += `
//                     <td style="cursor:pointer;color:#2563eb;"
//                         onclick="show_detail('${f}', \`${encodeURIComponent(val)}\`)">
//                         ${format_cell(f, val, shortVal)}
//                     </td>
//                 `;

//             } else {

//                 body_html += `
//                     <td>
//                         ${format_cell(f, val, shortVal)}
//                     </td>
//                 `;
//             }

//         });

//         body_html += "</tr>";
//     });

//     $("#data_body").html(body_html);
// }


// /* ===================== FORMAT TITLE ===================== */

// function to_title(text) {
//     return (text || "")
//         .replace(/_/g, " ")
//         .replace(/\b\w/g, l => l.toUpperCase());
// }


// /* ===================== TEXT FIELD CHECK ===================== */

// function is_text_field(val) {

//     if (!val) return false;
//     if (typeof val !== "string") return false;
//     if (val.length < 30) return false;
//     if (val.match(/^\d{4}-\d{2}-\d{2}/)) return false;
//     if (!isNaN(val)) return false;

//     return true;
// }


// /* ===================== FORMAT CELL ===================== */

// function format_cell(field, val, shortVal) {

//     if (field === "recommendation") {

//         if (val === "Recommended") {
//             return `<span class="badge-rec">${val}</span>`;
//         }
//         else if (val === "Not Recommended") {
//             return `<span class="badge-not">${val}</span>`;
//         }
//         else if (val === "Recommended + Expensive") {
//             return `<span class="badge-exp">${val}</span>`;
//         }
//     }

//     return shortVal;
// }


// /* ===================== POPUP ===================== */

// function show_detail(field, value) {

//     let decoded = decodeURIComponent(value || "");

//     let d = new frappe.ui.Dialog({
//         title: to_title(field),
//         size: "large",
//         fields: [
//             {
//                 fieldtype: "HTML",
//                 fieldname: "content"
//             }
//         ]
//     });

//     d.fields_dict.content.$wrapper.html(`
//         <div style="
//             background:#f9fafb;
//             padding:15px;
//             border-radius:10px;
//             border:1px solid #e5e7eb;
//             white-space:pre-wrap;
//             font-size:13px;
//         ">
//             ${decoded || "No Data"}
//         </div>
//     `);

//     d.show();
// }
// ===========================================3rd attemopt===================================

// frappe.pages['applicant-tracker-re'].on_page_load = function(wrapper) {

//     let page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'Applicant Tracker Report',
//         single_column: true
//     });

//     $(page.body).html(`
//         <div class="applicant-wrapper">

//             <div class="table-container">
//                 <table class="table table-hover applicant-table">
//                     <thead>
//                         <tr id="header_row"></tr>
//                     </thead>
//                     <tbody id="data_body"></tbody>
//                 </table>
//             </div>

//         </div>
//     `);

//     load_data();
// };


// /* ===================== DATA LOAD ===================== */

// function load_data() {
//     frappe.call({
//         method: "techner.techner.page.applicant_tracker_re.applicant_tracker_re.get_applicant_tracker_report",
//         callback: function(r) {

//             if (r.message && r.message.status === "success") {
//                 render_table(r.message.data);
//             } else {
//                 frappe.msgprint("Failed to load data");
//             }

//         }
//     });
// }


// /* ===================== TABLE RENDER ===================== */

// function render_table(data) {

//     if (!data || !data.length) return;

//     let fields = Object.keys(data[0]);

//     /* HEADER */
//     let header_html = "";
//     fields.forEach(f => {
//         header_html += `<th>${f.replace(/_/g, " ")}</th>`;
//     });
//     $("#header_row").html(header_html);

//     /* BODY */
//     let body_html = "";

//     data.forEach(row => {

//         body_html += "<tr>";

//         fields.forEach(f => {

//             let val = row[f] || "";
//             let shortVal = val;

//             if (typeof val === "string" && val.length > 60) {
//                 shortVal = val.substring(0, 60) + "...";
//             }

//             let is_clickable = is_text_field(val);

//             if (is_clickable) {

//                 body_html += `
//                     <td style="cursor:pointer;color:#2563eb;"
//                         onclick="show_detail('${f}', \`${encodeURIComponent(val)}\`)">
//                         ${format_cell(f, val, shortVal)}
//                     </td>
//                 `;

//             } else {

//                 body_html += `
//                     <td>
//                         ${format_cell(f, val, shortVal)}
//                     </td>
//                 `;
//             }

//         });

//         body_html += "</tr>";
//     });

//     $("#data_body").html(body_html);
// }


// /* ===================== SMART FIELD DETECTION ===================== */

// function is_text_field(val) {

//     if (!val) return false;

//     if (typeof val !== "string") return false;

//     // only long / descriptive text allowed
//     if (val.length < 30) return false;

//     // exclude dates
//     if (val.match(/^\d{4}-\d{2}-\d{2}/)) return false;

//     // exclude numeric values
//     if (!isNaN(val)) return false;

//     return true;
// }


// /* ===================== CELL FORMAT ===================== */

// function format_cell(field, val, shortVal) {

//     if (field === "recommendation") {

//         if (val === "Recommended") {
//             return `<span class="badge-rec">${val}</span>`;
//         }
//         else if (val === "Not Recommended") {
//             return `<span class="badge-not">${val}</span>`;
//         }
//         else if (val === "Recommended + Expensive") {
//             return `<span class="badge-exp">${val}</span>`;
//         }
//     }

//     return shortVal;
// }


// /* ===================== POPUP ===================== */

// function show_detail(field, value) {

//     let decoded = decodeURIComponent(value || "");

//     let d = new frappe.ui.Dialog({
//         title: to_title(field),
//         size: "large",
//         fields: [
//             {
//                 fieldtype: "HTML",
//                 fieldname: "content"
//             }
//         ]
//     });

//     d.fields_dict.content.$wrapper.html(`
//         <div style="
//             background:#f9fafb;
//             padding:15px;
//             border-radius:10px;
//             border:1px solid #e5e7eb;
//             white-space:pre-wrap;
//             font-size:13px;
//         ">
//             ${decoded || "No Data"}
//         </div>
//     `);

//     d.show();
// }

// function to_title(text) {
//     if (!text) return "";

//     return text
//         .replace(/_/g, " ")                 // replace underscore
//         .replace(/\b\w/g, l => l.toUpperCase()); // capitalize each word
// }
// frappe.pages['applicant-tracker-re'].on_page_load = function(wrapper) {

//     let page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'Applicant Tracker Report',
//         single_column: true
//     });

//     $(page.body).html(`
//         <div class="applicant-wrapper">
//             <div class="table-container">
//                 <table class="table table-hover applicant-table">
//                     <thead>
//                         <tr id="header_row"></tr>
//                     </thead>
//                     <tbody id="data_body"></tbody>
//                 </table>
//             </div>

//         </div>
//     `);

//     load_data();
// };


// /* ===================== DATA LOAD ===================== */

// function load_data() {
//     frappe.call({
//         method: "techner.techner.page.applicant_tracker_re.applicant_tracker_re.get_applicant_tracker_report",
//         callback: function(r) {

//             if (r.message && r.message.status === "success") {
//                 render_table(r.message.data);
//             } else {
//                 frappe.msgprint("Failed to load data");
//             }

//         }
//     });
// }


// /* ===================== TABLE RENDER ===================== */

// function render_table(data) {

//     if (!data || !data.length) return;

//     let fields = Object.keys(data[0]);

//     // HEADER
//     let header_html = "";

//     fields.forEach(f => {
//         header_html += `
//             <th>${f.replace(/_/g, " ")}</th>
//         `;
//     });

//     $("#header_row").html(header_html);

//     // BODY
//     let body_html = "";

//     data.forEach(row => {

//         body_html += "<tr>";

//         fields.forEach(f => {

//             let val = row[f] || "";

//             // 🎯 Special formatting for recommendation
//             if (f === "recommendation") {

//                 if (val === "Recommended") {
//                     body_html += `<td><span class="badge-rec">${val}</span></td>`;
//                 }
//                 else if (val === "Not Recommended") {
//                     body_html += `<td><span class="badge-not">${val}</span></td>`;
//                 }
//                 else if (val === "Recommended + Expensive") {
//                     body_html += `<td><span class="badge-exp">${val}</span></td>`;
//                 }
//                 else {
//                     body_html += `<td>${val}</td>`;
//                 }

//             } else {
//                 body_html += `<td>${val}</td>`;
//             }

//         });

//         body_html += "</tr>";
//     });

//     $("#data_body").html(body_html);
// }