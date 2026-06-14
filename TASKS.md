#Tasks

## Immediate tasks

book meeting for git instructions by smanthey, and code review of tsternbe code, online
get git names from all group members, pass to smanthey
set up regular weekly meetings

## Large Tasks

### backend: database
implement database for all stored objects and data

### backend: web sockets for select_game and for the games
implement web sockets to sync all actions between players once they are in select_game and beyond. This means, after user has handed over app to player.

### import_vocabulary
a mechanism for intelligently reading vocabulary lists in any number of formats, and turning them into double array of Words and Meanings

### group chat
implement group chat, where admins can write the entire group, or just the other admins, and all members can write to the admins.

### game statistics
a way for collecting and viewing game statistics for all your players

### Word Building
make the game Word Building

### Word Soup
make the game Word Soup

### visual design (and sound)
add a design concept to the entire app



## Medium Tasks

### invite_to_play/magic_link
create a magic link for the desktop, which brings player to personalized session after giving correct passPhrase. 

### invite_to_play/email_invite
send personalized invite link via email, that let's player directly access a game session, after giving correct passPhrase

### dashboard/user_settings
allows user to change name, password, and email 

### backend: unique usernames
implement check that all usernames are unique, and all emails valid

### notifications
system to register and send notifications to users, according to their settings

### log out guard in games
add guards for one player suddenly leaving by signing out, closing tab, or closing browser.
if player that initiated pending game leaves, while other players are waiting for it to start, the first waiting player in players array get's promoted to initiatedBy.


## Small Tasks

### Icon navigation
turn dicteé icon into clickable button that always navigates back to dashboard (if on higher level) or to landing page (if on dashboard)

### manage_group/notifications
option for selecting what kind of notifications to receive (for each group). message in chat, group action, game initiated

### manage_vocabulary/share-vocabulary
way to email a vocabulary object to someone else, by way of a unique token, that let's the receiver import the correct vocabulary object from the backend. So, player A share voc -> email to B. B clicks link in email, is asked to sign in, then new browser tab opens with import-vocabulary and the shared voc, or if easier, opens tab with new page receive-vocabulary.