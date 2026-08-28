# Interactive rc for the course shell (ttyd runs `bash --rcfile` with this).
#
# WHY A WRAPPER AROUND `claude`: the demo replays recorded answers, and the
# mock has a recording only for the turns of the walk. Auto mode does not just
# run a tool -- before each bash command it asks a MODEL whether the command is
# safe, and that request goes to the mock too. Nobody recorded it, so it misses;
# auto mode then cannot decide, and Claude Code writes its own error into the
# conversation as the tool result:
#
#   "... auto mode cannot determine the safety of bash right now"
#
# That error is part of the conversation from then on, so every later key is a
# key nobody recorded, and the walk dies mid-step. Skipping the permission gate
# removes the extra model call entirely. It is the right trade here and only
# here: the shell is inside a throwaway container, on a demo path, with an LLM
# that cannot do anything but replay a recording.
claude() {
  command claude --dangerously-skip-permissions "$@"
}

# The learner may well open a normal shell too; keep whatever the image set up.
if [ -f /etc/bash.bashrc ]; then . /etc/bash.bashrc; fi
if [ -f "$HOME/.bashrc" ]; then . "$HOME/.bashrc"; fi
