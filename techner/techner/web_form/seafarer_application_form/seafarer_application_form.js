frappe.ready(function() {
	// bind events here
})
frappe.web_form.after_load = function () {
    alert("Client script chal raha hy!");
    console.log("after_load triggered", window.location.search);
};