const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// 🎯 SETUP NODEMAILER EMAIL TRANSMITTER INTERNAL LINK
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper validation automation routine to fire mail dispatches
const sendAlertEmail = async (toEmail, subject, text) => {
  try {
    await transporter.sendMail({
      from: `"Peppy Tracker Automation" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      text: text
    });
    console.log(`📡 Automation mail successfully delivered to: ${toEmail}`);
  } catch (err) {
    console.error(`❌ Email automation packet drop for ${toEmail}:`, err.message);
  }
};

const initScheduler = () => {
  console.log("🔄 Task Cadence Scheduler Engine Triggered...");

  // ⏰ CRON CYCLE: Runs everyday at midnight (00:00) to parse recurrence states
  cron.schedule('0 0 * * *', async () => {
    try {
      const today = new Date();
      console.log(`⚙️ Auditing active tasks matrix for matching cadence rules: ${today.toDateString()}`);

      // FETCH ALL TASKS THAT ARE COMPLETED AND HAVE A RECURRING CADENCE
      const completedRecurringTasks = await Task.find({
        status: 'Completed',
        recurrenceType: { $in: ['Daily task', 'Weekly task', 'Monthly task', 'Quarterly task'] }
      }).populate('assignedTo');

      // ------------------------------------------------------------------
      // 🚨 PHASE 1: RE-ASSIGNMENT LAYER & FOUNDER NOTIFICATION CORE
      // ------------------------------------------------------------------
      for (let task of completedRecurringTasks) {
        let shouldReassign = false;
        
        const completionDate = new Date(task.updatedAt);
        const timeDiff = today - completionDate;
        const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        if (task.recurrenceType === 'Daily task' && daysPassed >= 1) shouldReassign = true;
        if (task.recurrenceType === 'Weekly task' && daysPassed >= 7) shouldReassign = true;
        if (task.recurrenceType === 'Monthly task' && daysPassed >= 30) shouldReassign = true;
        if (task.recurrenceType === 'Quarterly task' && daysPassed >= 90) shouldReassign = true;

        if (shouldReassign) {
          const employeeName = task.assignedTo ? task.assignedTo.name : 'Unassigned Pool';
          const employeeEmail = task.assignedTo ? task.assignedTo.email : null;

          // 📢 A. NOTIFY FOUNDER INSTANTLY UPON COMPLETION CYCLE TRIGGER
          const founderEmailAddress = process.env.FOUNDER_EMAIL || 'founder@peppytrack.com';
          
          // Hum Daily tasks ka load founder inbox par nahi dalenge, sirf Weekly, Monthly aur Quarterly bhejenge
          if (task.recurrenceType !== 'Daily task') {
            const founderSubject = `👑 Task Completed Notification: [${task.recurrenceType.toUpperCase()}]`;
            const founderBody = `Hello Founder,\n\nThis is an automated operational audit report.\n\nThe following recurring milestone task has been successfully marked as COMPLETED:\n\n- Task Title: ${task.title}\n- Cadence Type: ${task.recurrenceType}\n- Executed By: ${employeeName}\n- Completion Date: ${completionDate.toLocaleDateString()}\n\nThe system has archived this log and deployed a fresh placeholder card for their next workflow cycle.\n\nBest,\nPeppy Tracker Core System.`;
            
            await sendAlertEmail(founderEmailAddress, founderSubject, founderBody);
            console.log(`👑 Founder notification mail fired for completed task: [${task.title}]`);
          }

          // B. Initialize duplicate copy structure for the next operational loop
          const replicatedTask = new Task({
            title: task.title,
            description: task.description || 'No instruction guidelines context declared.',
            priority: task.priority,
            status: 'To Do', 
            project: task.project,
            assignedTo: task.assignedTo ? task.assignedTo._id : null,
            recurrenceType: task.recurrenceType,
            dueDate: new Date(today.getTime() + (task.recurrenceType === 'Daily task' ? 1 : task.recurrenceType === 'Weekly task' ? 7 : task.recurrenceType === 'Monthly task' ? 30 : 90) * 24 * 60 * 60 * 1000)
          });

          await replicatedTask.save();
          console.log(`🎯 Re-assigned task: [${task.title}] for the next ${task.recurrenceType} execution loop.`);

          // C. Dispatch dynamic notification mail alerts directly to the assigned employee
          if (employeeEmail) {
            let intervalMessage = "";
            if (task.recurrenceType === 'Weekly task') intervalMessage = "1 week has passed since your last update cycle.";
            if (task.recurrenceType === 'Monthly task') intervalMessage = "1 month has passed since your last deployment cycle.";
            if (task.recurrenceType === 'Quarterly task') intervalMessage = "3 months have passed since your last strategic review cycle.";
            if (task.recurrenceType === 'Daily task') intervalMessage = "Your daily task loop is active.";

            const emailSubject = `🚀 Peppy Tracker: New ${task.recurrenceType} Assigned!`;
            const emailBody = `Hello ${employeeName},\n\nYour recurring task "${task.title}" has been cloned and re-assigned to you as scheduled. ${intervalMessage}\n\nPlease check your workspace dashboard to complete the objectives.\n\nBest,\nOperations Desk Management.`;
            
            await sendAlertEmail(employeeEmail, emailSubject, emailBody);
          }

          // Update active task recurrence configuration to 'One-time task' so it acts as historic logs and never loops duplicate chains again
          task.recurrenceType = 'One-time task';
          await task.save();
        }
      }

      // ------------------------------------------------------------------
      // 🚨 PHASE 2: QUARTERLY 15-DAY PRIOR EMAIL REMINDER GATES
      // ------------------------------------------------------------------
      const activeQuarterlyTasks = await Task.find({
        status: { $ne: 'Completed' },
        recurrenceType: 'Quarterly task'
      }).populate('assignedTo');

      for (let qTask of activeQuarterlyTasks) {
        if (qTask.dueDate) {
          const targetDueDate = new Date(qTask.dueDate);
          const alertTimeDiff = targetDueDate - today;
          const daysRemaining = Math.ceil(alertTimeDiff / (1000 * 60 * 60 * 24));

          if (daysRemaining === 15 && qTask.assignedTo && qTask.assignedTo.email) {
            const warningSubject = `⚠️ Reminder: 15 Days Left For Your Quarterly Task Milestone!`;
            const warningBody = `Hello ${qTask.assignedTo.name},\n\nThis is a scheduled operational reminder. Your assigned Quarterly Task: "${qTask.title}" is reaching its milestone constraint in exactly 15 days (Due: ${targetDueDate.toLocaleDateString()}).\n\nPlease align your sprint logs and ensure complete tracking before the threshold breaches.\n\nBest,\nFounder Audit Engine.`;
            
            await sendAlertEmail(qTask.assignedTo.email, warningSubject, warningBody);
          }
        }
      }

    } catch (err) {
      console.error('❌ Scheduler dynamic loop tracking error breakdown:', err);
    }
  });
};

module.exports = initScheduler;