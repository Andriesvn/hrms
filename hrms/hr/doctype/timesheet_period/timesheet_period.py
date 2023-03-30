# -*- coding: utf-8 -*-
# Copyright (c) 2021, AvN Technologies and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate
from hrms.hr.utils import validate_overlap

class TimesheetPeriod(Document):
	def autoname(self):
		# select a project name based on customer
		self.name = 'TSP:{0}-{1}-{2}'.format(self.company,self.date_from,self.date_to)
	
	def validate(self):
		self.validate_dates()
		validate_overlap(self, self.date_from, self.date_to, self.company)

	def validate_dates(self):
		if getdate(self.date_from) >= getdate(self.date_to):
			frappe.throw(_("To date can not be equal or less than from date"))

	def on_submit(self):
		# Create Time Sheets for all empolyees in this company
		self.create_monthly_timesheets()

	def on_cancel(self):
		frappe.delete_doc("Monthly Timesheet", frappe.db.sql_list("""select name from `tabMonthly Timesheet`
			where timesheet_period=%s """, (self.name)))

	@frappe.whitelist()
	def create_monthly_timesheets(self):
		# get a list of all employees with a salary structure assignment
		employee_list = [d.name for d in self.get_employees()]
		if employee_list == None or len(employee_list) == 0 :
			frappe.throw(
				_("No Employees found to generate Timesheets for. Only Employees marked with the Timesheet Required option ")
				)
		args = frappe._dict({
				"timesheet_period": self.name,
			})
		if len(employee_list) > 30:
			frappe.enqueue(insert_employee_timesheets, timeout=600, employees=employee_list, args=args)
		else:
			insert_employee_timesheets(employee_list, args, publish_progress=False)
			# since this method is called via frm.call this doc needs to be updated manually
			self.reload()

	def get_employees(self):
		employee_list = frappe.get_all('Employee', 'name', {
			'status': 'Active',
			'company': self.company, 
			'timesheet_required': 1
			}) 
		return employee_list

def insert_employee_timesheets(employees, args, publish_progress=True):
	existing_timesheets = get_existing_timesheets(args)
	print("existing timesheets:", existing_timesheets)
	total_count=0
	inserted_count=0
	for emp in employees:
		total_count+=1
		if emp not in existing_timesheets:
			args.update({
				"doctype": "Monthly Timesheet",
				"employee": emp
			})
			ss = frappe.get_doc(args)
			#print('Creating Timesheet for ', emp)
			ss.insert()
			inserted_count+=1
		if publish_progress:
			frappe.publish_progress(total_count*100/len(set(employees) - set(existing_timesheets)),
				title = _("Creating TimeSheets..."))
	timesheet_period = frappe.get_doc("Timesheet Period", args.timesheet_period)
	timesheet_period.notify_update()
	if publish_progress == False:
		frappe.msgprint(_("Timesheets where generated for {0}/{1} employees").
									format(str(inserted_count), str(total_count)), alert=False)

def get_existing_timesheets(args):
	existing = []
	MonthlyTimesheet = frappe.qb.DocType('Monthly Timesheet')
	result = frappe.qb.from_(MonthlyTimesheet).select(MonthlyTimesheet.employee).distinct().where(MonthlyTimesheet.timesheet_period == args.timesheet_period).run()
	for emp in result:
		existing.append(emp[0])
	return existing

