#Tasks

## Immediate tasks

book meeting for git instructions by smanthey, and code review of tsternbe code, online
get git names from all group members, pass to smanthey
set up regular weekly meetings

##Large Tasks

### backend: database
implement database for all stored objects and data

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

### visual design
add a design concept to the entire app



## Medium Tasks

### invite_to_play/magic_link
create a magic link for the desktop, which brings player to personalized session after giving correct passPhrase

### invite_to_play/email_invite
send personalized invite link via email, that let's player directly access a game session, after giving correct passPhrase

### dashboard/user_settings
allows user to change name, password, and email 

### backend: unique usernames
implement check that all usernames are unique, and all emails valid

### notifications
system to register and send notifications to users, according to their settings


## Small Tasks

### Icon navigation
turn dicteé icon into clickable button that always navigates back to dashboard (if on higher level) or to landing page (if on dashboard)

### manage_group/notifications
option for selecting what kind of notifications to receive (for each group). message in chat, group action, game initiated

### manage_vocabulary/share-vocabulary
way to email a vocabulary object to someone else, by way of a unique token, that let's the receiver import the correct vocabulary object from the backend. So, player A share voc -> email to B. B clicks link in email, is asked to sign in, then new browser tab opens with import-vocabulary and the shared voc, or if easier, opens tab with new page receive-vocabulary.