const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Note = require('../models/Note');

// All routes in this router require token authentication
router.use(auth);

// @route   GET api/notes
// @desc    Get all notes for authenticated user
router.get('/', async (req, res) => {
  try {
    const notes = await Note.find({ user: req.userId }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error('Fetch notes error:', err);
    res.status(500).json({ message: 'Server error retrieving notes' });
  }
});

// @route   POST api/notes
// @desc    Create a note
router.post('/', async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Please include title and content' });
  }

  try {
    const newNote = new Note({
      user: req.userId,
      title,
      content
    });

    const note = await newNote.save();
    res.status(201).json(note);
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ message: 'Server error saving note' });
  }
});

// @route   PUT api/notes/:id
// @desc    Update a note
router.put('/:id', async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Please include title and content' });
  }

  try {
    let note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Verify user owns the note
    if (note.user.toString() !== req.userId) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    note.title = title;
    note.content = content;

    await note.save();
    res.json(note);
  } catch (err) {
    console.error('Update note error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.status(500).json({ message: 'Server error updating note' });
  }
});

// @route   DELETE api/notes/:id
// @desc    Delete a note
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Verify user owns the note
    if (note.user.toString() !== req.userId) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await note.deleteOne();
    res.json({ message: 'Note removed successfully' });
  } catch (err) {
    console.error('Delete note error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.status(500).json({ message: 'Server error deleting note' });
  }
});

module.exports = router;
