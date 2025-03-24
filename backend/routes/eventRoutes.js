const express = require('express');
const router = express.Router();
const Event = require('../models/Event'); // Import Event model
const Student = require('../models/Student'); // Import Student model

// 📅 Route: Tutor Creates Event
router.post('/tutor/create-event', async (req, res) => {
    try {
        const { title, description, date, tutorId, students } = req.body;

        // Create new event
        const event = new Event({ title, description, date, tutorId, students });
        await event.save();

        res.status(201).json({ message: 'Event created successfully!', event });
    } catch (error) {
        res.status(500).json({ message: 'Error creating event', error: error.message });
    }
});

// 📌 Route: Get All Events for a Student
router.get('/student/:studentId/events', async (req, res) => {
    try {
        const events = await Event.find({ students: req.params.studentId }).sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching events', error: error.message });
    }
});

// 📌 Route: Delete an Event (Tutor Only)
router.delete('/tutor/delete-event/:eventId', async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.eventId);
        res.json({ message: 'Event deleted successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting event', error: error.message });
    }
});

module.exports = router;
