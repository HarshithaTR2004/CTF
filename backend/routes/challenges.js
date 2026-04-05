router.post("/:id/submit", auth, async (req, res) => {
  const { flag } = req.body;

  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ msg: "Challenge not found" });
    }

    if (flag !== challenge.flag) {
      return res.status(400).json({ msg: "Incorrect flag" });
    }

    const user = await User.findById(req.user.id);

    if (user.completedChallenges.includes(challenge._id)) {
      return res.status(400).json({ msg: "Already solved" });
    }

    user.completedChallenges.push(challenge._id);
    user.xp += challenge.points;
    user.streak += 1;
    await user.save();

    res.json({
      msg: "Correct flag!",
      xp: user.xp,
      streak: user.streak
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});
