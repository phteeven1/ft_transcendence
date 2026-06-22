#Tasks

## Immediate tasks


## Large Tasks

### import_vocabulary
a mechanism for intelligently reading vocabulary lists in any number of formats, and turning them into double array of Words and Meanings

### activity window in manage_group
a window shown at the bottom of manage_group, with two tabs to select what to display: the group chat or the selected members profile. See below.

### show user profiles
user profiles shown in activity window at bottom of manage_group. The window shows the profile of the currently selected user from member-list. At mount, currentUser is automatically the selected user. Profile shows the following: user-name, admin status, last sign in, and registered players names (user names). Optional fields are: user real name, relationship comment (for example "Dana's Mum") user email.

### group chat
implement group chat, where admins can write the entire group, or just the other admins, and all members can write to the admins. This is shown in activity window in manage_groups

### players' profiles
in manage_player, a profile window below buttons and player-list. This will show the selected player. If no player is selected, it will show the fields with no content. Fields include: player name (the user name), avatar (with option to set avatar), Spelling mates (a scrollable list of all players in the same group, this is our Friend's system), Scores (a scrollable window of last played games and scores).

### game statistics
a way for collecting and viewing game statistics for all your players. Displayed in simplified form in player profile. Could be shown more elaboratedly in its own button under manage_player.

### Word Building
make the game Word Building

### Word Soup
make the game Word Soup

### visual design (and sound)
add a design concept to the entire app

### support for three languages
Implement German, English and French. All text towards user needs to be stored in a file or db that can be easily corrected and changed. language-context decides which text snippets to be displayed.


## Medium Tasks

### invite_to_play/magic_link
create a magic link for the desktop, which brings player to personalized session after giving correct passPhrase. 

### invite_to_play/email_invite
send personalized invite link via email, that let's player directly access a game session, after giving correct passPhrase

### dashboard/user_settings
allows user to change user name, password, email, real name, and relationship comment. Options to show or not show in other user's profiles: email, real name, relationship comment.  

### backend: unique usernames
implement check that all usernames are unique, and all emails valid

### correct session-tokens system
add the following functionality: 
#### add guard to puzzle
checking if session is still valid is only done at leaving a game. should also happen on leaving a puzzle, to make ended session obvious earlier. 
#### remove leaving player from games
when a player leaves, closes tab etc, they should be removed from all pending games they are waiting for. If they were the initiating player, the next player that joined will now be initiating player, with the ability to start the game. Otherwise pending games 'hang' when the initiating player leaves or accidentally logs out.

## Small Tasks

### Icon navigation
turn dicteé icon into clickable button that always navigates back to dashboard (if on higher level) or to landing page (if on dashboard)

### manage_vocabulary/share-vocabulary (optional)
way to email a vocabulary object to someone else, by way of a unique token, that let's the receiver import the correct vocabulary object from the backend. So, player A share voc -> email to B. B receives email, clicks link, and gets to log in, then lands on receive_vocabulary which shows vocabulary, says from which email it came, asks if they want to accept it, and then asks which group to use it in. Alternatively, this could be integrated into import_voacbulary. Why it is hard to share backend without sending email, but using email for verification: how do we notify the user they got a shared voc? How do we ask which group to use it in. 