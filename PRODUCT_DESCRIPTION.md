# Dictee
A web based app for helping school children with their language homework by generating simple crossword games based on their uploaded vocabulary lists. It uses Next.js for frontend and NestJS for backend. It uses ORM for the database.

<details>
  <summary>Modules (3 Points)</summary>
  <ul>
    <li><b>Major: Use a framework for both frontend and backend.</b></li>
    <li>Minor: Use ORM for database</li>
  </ul>
</details>

## Table of Contents
- [Dictee](#dictee)
  - [Table of Contents](#table-of-contents)
  - [Users](#users)
    - [Profiles](#profiles)
    - [Parents](#parents)
    - [Players](#players)
  - [Vocabulary Lists](#vocabulary-lists)
  - [Games](#games)
    - [Word Building](#word-building)
    - [Word soup (optional)](#word-soup-optional)

## Users
There are two types of users, Users(Parents) and Players(their children). Users can be Member of Groups, or they can be Admin for a Group. Only Users can start using Dictee without being invited. When someone visits Dictee for the first time, they are asked to register a User profile, or if they want to play the games, to ask one of their parents to register a Profile first. Technically, of course, a person could first register a User(Parent) profile and then create a Player profile for themselves. This is not a problem since the purpose of separating Users and Players is not to stop parents from playing, but to allow parents extra control over who their children play the online games with. Since one can only join a Group by invitation, only people who know each other will be in the same Group. If a child created their own User Profile to invite other children to play, they could only do this over their own email and social media accounts, and only children who are allowed to use email and social media will be able to do this.

### Profiles
When registering a Profile, users are asked to pick a Username and a Password. Uniqueness is checked. They are also asked for their Email, to enable sending group invitations, *and to opt in or out of browser push Notifications*.

<details>
  <summary>Modules (6 Points)</summary>
  <ul>
    <li><b>Major: Standard user management and authentification.</b></li>
    <li><b>Major: Advanced permissions system (user, admin, guest).</b></li>
    <li>Minor: Game statistics and match history</li>
    <li>Minor of own choice: Magic Links and Profile Shortcuts, for Parents and Players</li>
  </ul>
</details>

### Users
Users (Parents) can either join a Group by clicking an Invite Link sent to them on email or social media, or create a new Group. If they created the Group, they are automatically Group Admin, and are asked to name the Group.

Group Admins can:
- Create unique Invite Links to email to other parents.
- Expel a Group Member.
- Rename the Group.
- Make other Users in the Group into Group Admins.
- Import a Vocabulary List.
- Rename Vocabulary Lists.
- Make a Vocabulary List the default list for current Games.
- Remove Vocabulary Lists.
- Edit Vocabulary Lists.
- Terminate the Group, but only if they are the only Group Admin.
- Resign their own Admin status (only if there is at least one other Admin).
- *Write Group Admin Messages*.
- *Write Group Messages*.

All Parents who are Members or Admins of a Group can:
- Set up a Profile for one or more Players.
- *Create a Login Shortcut for their own Players' Profiles*.
- *View game Statistics regarding their own Players (only)*.
- Terminate the Profiles of their own Players.
- Leave the Group.
- *Select other player's in the same group as TeamMates.*
- *Get notified when TeamMates enter a game session*
- *Read the Group Chat. This is where actions affecting the Group are logged, and Group Messages appear*.
- *Write Messages to the Group Admins*.

The User dashboard of a parent will show:
- Create New Group, which allows them to create a new group.
- All Groups which they are members of. Highlights indicate if they are Admin or not, *and if Notifications are on or off*.
- Profile Settings, to change Username, Password, Email, notifications etc.

Only if they select a Group, can they see, and choose all the options relating to that Group, including it's Player Profiles and Vocabulary Lists. In the Group Dashboard, next to the buttons, is a list with all members of the group also noting if they are admin or just members. 

Also in the Dashboard is an action-window with two tabs. It can display either the Profile of the member currently selected from the member-list, or the group chat.

<details>
  <summary>Full Action Icon Tree for Parents</summary>
  <b>Boldface designates actions only available to Admins</b>
  <ul>
    <li>Create New Player</li>
    <li>
      <details>
        <summary>Groups</summary>
        <ul>
          <li>
            <details>
              <summary>Manage Players</summary>
              <ul>
                <li>Create Player</li>
                <li>Rename Player</li>
                <li>Edit PassPhrase</li>
                <li>Delete Player</li>
                <li>
                  <details>
                    <summary>Invite to Play</summary>
                    <ul>
                      <li>Play Now</li>
                      <li>Create Magic Link  --  MISSING</li>
                      <li>Email Temporary Link  --  MISSING</li>
                    </ul>
                  </details>
                </li>
              </ul>
            </details>
          </li>
          <li>
            <details>
              <summary><b>Manage Vocabulary</b></summary>
              <ul>
                <li><b>Import Vocabulary</b></li>
                <li><b>Use in Games</b></li>
                <li><b>Rename Vocabulary</b></li>
                <li><b>Edit Vocabulary</b></li>
                <li><b>Share Vocabulary  --  MISSING</b></li>
                <li><b>Delete Vocabulary</b></li>
              </ul>
            </details>
          </li>
          <li><b>Send Invite</b></li>
          <li><b>Rename Group</b></li>
          <li>Leave Group</li>
          <li><b>Promote to Admin</b></li>
          <li><b>Resign as Admin</b></li>
          <li><b>Expel Member</b></li>
          <li><b>Delete Group</b></li>
        </ul>
      </details>
    </li>
    <li>
      <details>
        <summary>User Settings</summary>
        <ul>
          <li>Change Username</li>
          <li>Change Real Name</li>
          <li>Change Password</li>
          <li>Change Email</li>
          <li>Change Relationship Info (for example "Dana's Mum")</li>
        </ul>
      </details>
    </li>
  </ul>
</details>


### Players
Players can access their own Profile, either by clicking their own unique Login Shortcut, or by visiting the website and entering username and answering the passphrase question.
Players can:
- See which Games are being played by other Players from the same Group right now. also, how many players are playing it (but not which players), when the game was started, and how many percent of the game is finished.
- See available Games that are not being played.
- See Pending Games waiting for more Players to join.
- Join a pending Game. When enough Players have joined a Pending Game, it starts, and are then displayed as Ongoing instead. If several pending games are available, a player can choose to join more than one. The moment one of the pending games he has joined starts (by another player joining, or because the required number was reached by him joining) he is taken off the player lists of all other pending games. This way, you can't be waiting to join another game as you are playing, and thus not keep other players waiting for you to finish.
- Initiate an available Game that is not being played at the moment. They are asked if they want to start a single Player Game, or if they want to wait for other Players to join. They can choose how many players to wait for. All Parents in the Group who have opted for this, will receive a notification. The game will appear as Pending, and the number of Players having joined/needing to join, will be displayed as for example "1/4". When the specified number of Players have joined, the Game starts.
- When a Player joins a pending Game, or initiates a new pending Game, a popup window appears, informing them that they are waiting for X more players to join before the Game starts, but that they can press Esc to stop waiting. The mouse is disabled during the wait, but they can still see which other games are being played, are pending etc. This is to stop Players from initiating several games at the same time. If all waiting Players leave a pending Game, it is removed.


### Vocabulary Lists
The Vocabulary Lists are the basis of all games. They can be extracted from any of a number of common text file formats. Once a file has been uploaded, the text is shown in a separate window, and the user is asked to select the text to be included into the vocabulary list. This way, the user can exclude headers and explanations like "List 5" or "English vocabulary for Friday". After each selection, the user is asked if they want to finish the list or add another section. After selection is finished, the text is then automatically divided into a list separated by any of the following chars ",.;:\n" but not by simple spaces. The list is presented to the user, as a simple list separated by linebreak only, with all non letter characters apart from spaces removed. The user can now toggle up or down and correct, so that for example 
"der"
"Arm"
becomes
"der Arm"
and
"der Arm das Bein"
becomes
"der Arm"
"das Bein"
The crossword algorithm checks if it can build a crossword which fits inside a 24x24 grid from the list. If not, it automatically divides the list in two and tries again. It prompts the user to name each list and saves them.
While importing a vocabulary, the user is asked what language the vocabulary words are. This question can be based on a guess, but doesn't have to. Knowing which language is important for randomly selected noise letters in the games. A language API can be used to produce a dropdown menu for valid BCP 47 tags.

### *Group Chat*
Chat window appears below the function buttons in manage_group. There is no chat in dashboard, since all chats are group specific. Chat has two main functions: 

## *Messaging*
It allows short messages to be written between Admins->Admins, Admins->Members and Members->Admins. No messaging directly to individual Users and no messaging from Members to Members (to avoid the Dicteé chat becomming a general messaging service. It is there for Dicteé related info).

## *Log*
It is a log of all important activity in the group. Hence, it can be scrolled back endlessly until the start of the Group. Most group events initiated by Admins, will trigger a short entry into the chat log, like this
DD-MM-YYYY HH:MM UserName " promoted to Admin " UserName or
DD-MM-YYYY HH:MM UserName " renamed Group " GroupName
Manage Player events won't trigger log entries, and only the most important Manage Vocabulary events will.

## *Chat visibility filter*
A number of colored clickable buttons appear under the chat window. Selecting and deselecting them (any combination is possible) will filter what you see in the chat. All messages in the chat are color coded in the same way. Also, all events triggered by and all messages written by oneself, appear in boldface.

### *Chat visibility options*
A->A   messages from Admins to other Admins
A->M   messages from Admins to Members
M->A   messages from Members to Admins
Group  all Group events

### *Writing chat messages*
select the button "Write Message" then select from modal to whom. Another modal opens that allows a message to be written, reviewed, and finally posted. The modals should appear in the upper half of the screen, so that it is fairly easy to keep the chat window visible at the same time.

### *Data structure of chat*
The chat entries should be saved not as strings but as an array of objects, with at least time, originator, type, target (can be null) and content (can be null). This way, names will remain correct even after rename events. 

## *Games*
Dicteé is conceived such, that many Games can be added to the website later. It needs at least one Game. Probably use SVG text elements for the grid of letters, since this frees us from having to import hundreds of letter-images, and still allows styling. Then animate player elements in separate div with position: absolute.

### *Word Building*
A crossword is automatically generated that fits on a maximum 24x24 grid. On the tile in front of every word, an arrow is indicating the start of the word. All letters making up the entire list are randomly placed over the grid. The players can direct little trucks around the playing field. They can pick up letters and put them down in other (empty) squares. If they drive over an arrow, the word is read out in audio, and the squares where the word should fit are progressively lit up so that the players can see how long it is. Any square in the word that contains the correct letter lights up in green, empty squares light up in blue, and squares containing the wrong letter light up in red. The players continue building together until the crossword is complete. In the end, each player gets one point per letter that they placed correctly. You can get maximum one point per letter, even if it is removed and replaced several times. The player that first placed it correctly gets the point.

<details>
  <summary>Modules (6 Points)</summary>
  <ul>
    <li><b>Major: Implement a complete web-based real-time multiplayer game.</b></li>
    <li><b>Major: Remote players.</b></li>
    <li><b>Major: Multiplayer game.</b></li>
  </ul>
</details>

### *Word soup (optional)*
First, the list of words is displayed for a brief while (1 sec per word). Then, a word soup is generated (a grid of 24x24 squares where the words are hidden among other random letters. Words can cross each other. Words can be displayed horizontally from left to right and vertically from up to down. The player can use the mouse (or finger on mobile) to mark a word, by starting at its beginning, holding the mouse button, and selecting the word. If they correctly mark the word, it light up and changes color. It only lights up, as the mouse button/finger is released, so that one has to commit to a guess before finding out if it is correct. If you mark the wrong boxes, you are frozen for 5 s. This is to stop players from randomly swiping all over the grid. The Game can be played by several players simultaneously. Each Player has their own color, which shows which words were claimed by which player. The Players gets one point per correct word. You see the guesses of the other players appear as colored swipes.

<details>
  <summary>Modules (2 Points)</summary>
  <ul>
    <li><b>Major: Add another Game with user history and matchmaking.</b></li>
  </ul>
</details>