# Copyright (c) 2022, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

import frappe
from frappe import _
from frappe.model.naming import set_name_by_naming_series
from frappe.utils import add_years, cint, getdate

from erpnext.setup.doctype.employee.employee import Employee
from hrms.hr.utilities.zk_clocking_sheduler import (
	insert_employee_clockings_from_zk_based_on_employee_field,
)


class EmployeeMaster(Employee):
	def autoname(self):
		naming_method = frappe.db.get_value("HR Settings", None, "emp_created_by")
		if not naming_method:
			frappe.throw(_("Please setup Employee Naming System in Human Resource > HR Settings"))
		else:
			if naming_method == "Naming Series":
				set_name_by_naming_series(self)
			elif naming_method == "Employee Number":
				self.name = self.employee_number
			elif naming_method == "Full Name":
				self.set_employee_name()
				self.name = self.employee_name

		self.employee = self.name


def validate_onboarding_process(doc, method=None):
	"""Validates Employee Creation for linked Employee Onboarding"""
	if not doc.job_applicant:
		return

	employee_onboarding = frappe.get_all(
		"Employee Onboarding",
		filters={
			"job_applicant": doc.job_applicant,
			"docstatus": 1,
			"boarding_status": ("!=", "Completed"),
		},
	)
	if employee_onboarding:
		onboarding = frappe.get_doc("Employee Onboarding", employee_onboarding[0].name)
		onboarding.validate_employee_creation()
		onboarding.db_set("employee", doc.name)


def update_approver_role(doc, method=None):
	"""Adds relevant approver role for the user linked to Employee"""
	if doc.leave_approver:
		user = frappe.get_doc("User", doc.leave_approver)
		user.flags.ignore_permissions = True
		user.add_roles("Leave Approver")

	if doc.expense_approver:
		user = frappe.get_doc("User", doc.expense_approver)
		user.flags.ignore_permissions = True
		user.add_roles("Expense Approver")


def update_employee_transfer(doc, method=None):
	"""Unsets Employee ID in Employee Transfer if doc is deleted"""
	if frappe.db.exists("Employee Transfer", {"new_employee_id": doc.name, "docstatus": 1}):
		emp_transfer = frappe.get_doc("Employee Transfer", {"new_employee_id": doc.name, "docstatus": 1})
		emp_transfer.db_set("new_employee_id", "")


@frappe.whitelist()
def get_timeline_data(doctype, name):
	"""Return timeline for attendance"""
	from frappe.desk.notifications import get_open_count

	out = {}

	open_count = get_open_count(doctype, name)
	out["count"] = open_count["count"]

	timeline_data = dict(
		frappe.db.sql(
			"""
			select unix_timestamp(attendance_date), count(*)
			from `tabAttendance` where employee=%s
			and attendance_date > date_sub(curdate(), interval 1 year)
			and status in ('Present', 'Half Day')
			group by attendance_date""",
			name,
		)
	)

	out["timeline_data"] = timeline_data
	return out


@frappe.whitelist()
def get_retirement_date(date_of_birth=None):
	if date_of_birth:
		try:
			retirement_age = cint(frappe.db.get_single_value("HR Settings", "retirement_age") or 60)
			dt = add_years(getdate(date_of_birth), retirement_age)
			return dt.strftime("%Y-%m-%d")
		except ValueError:
			# invalid date
			return

@frappe.whitelist()
def download_employee_clockings(employee, date_from, date_to):
	if getdate(date_from) >= getdate(date_to):
			frappe.throw(_("To date can not be equal or less than from date"))
	employee_doc = frappe.get_doc('Employee', employee)
	if employee_doc == None:
		frappe.throw(_("Cannot Find Employee"))
	insert_employee_clockings_from_zk_based_on_employee_field(employee,date_from,date_to)

@frappe.whitelist()
def generate_shifts_for_employee(employee, date_from, date_to, shift_pattern):
	if getdate(date_from) >= getdate(date_to):
			frappe.throw(_("To date can not be equal or less than from date"))
	
	shift_pattern_doc = frappe.get_doc('Shift Pattern', shift_pattern)
	if shift_pattern_doc == None:
		frappe.throw(_("Cannot Find Shift Pattern"))
	if (shift_pattern_doc):
		employee_doc = frappe.get_doc('Employee', employee)
		if employee_doc == None:
			frappe.throw(_("Cannot Find Employee"))
		shift_pattern_doc.build_shift_assignments_for_employees_by_date_range(date_from,date_to,[employee_doc],add_data = {
				'auto_generated_shift_pattern': shift_pattern
		})



