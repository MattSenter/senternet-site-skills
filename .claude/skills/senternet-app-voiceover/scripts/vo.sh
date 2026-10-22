#!/bin/zsh
# Drive the VoiceOver cursor and print what VoiceOver actually spoke.
#
#   vo.sh next [n]     move right n times (default 1)
#   vo.sh prev [n]     move left
#   vo.sh into         interact with the item under the cursor (VO-Shift-Down)
#   vo.sh out          stop interacting (VO-Shift-Up)
#   vo.sh act          press the item (VO-Space)
#   vo.sh first        first item in the current container
#   vo.sh menus        jump to the status menus (relative to where the cursor is!)
#   vo.sh say          print the current phrase and the text under the cursor
#   vo.sh '<raw>'      any other VoiceOver AppleScript, run inside `tell application "VoiceOver"`
#
# Needs "Allow VoiceOver to be controlled with AppleScript" on (VoiceOver Utility >
# General). Each line is "[action] <last phrase>". Hints ("You are currently on a
# button...") and terminal output VoiceOver happens to announce can replace the
# phrase; `say` reads the text under the cursor as a cross-check.

a=${1:-say}
n=${2:-1}
(( n < 1 )) && n=1

phrase() { timeout 15 osascript -e 'tell application "VoiceOver" to get content of last phrase' 2>&1; }

if [[ $a == say ]]; then
  print -r -- "[phrase] $(phrase)"
  print -r -- "[cursor] $(timeout 15 osascript -e 'tell application "VoiceOver" to get text under cursor of vo cursor' 2>&1)"
  exit
fi

for i in {1..$n}; do
  case $a in
    next)  c='tell vo cursor to move right' ;;
    prev)  c='tell vo cursor to move left' ;;
    into)  c='tell vo cursor to move into item' ;;
    out)   c='tell vo cursor to move out of item' ;;
    act)   c='tell vo cursor to perform action' ;;
    first) c='tell vo cursor to move to first item' ;;
    menus) c='tell vo cursor to move to status menu' ;;
    *)     c=$a ;;
  esac
  r=$(timeout 15 osascript -e "tell application \"VoiceOver\" to $c" 2>&1)
  sleep 0.5
  print -r -- "[$a] $(phrase)${r:+  !! $r}"
done
