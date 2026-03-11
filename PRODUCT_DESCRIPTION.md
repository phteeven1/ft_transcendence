# Dictee
A web based app for helping school children with their language homework by generating simple crossword games based on their uploaded vocabulary lists. It uses Next.js for frontend and NodeJS for backend. It uses ORM for the database.

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
There are two types of users, Parents and Players. Users can belong to Groups. Parents can be Admin for a Group. Only Parents can start using Dictee without being invited. When someone visits Dictee for the first time, they are asked to register a Parent profile, or if they want to play the games, to ask one of their parents to register a Profile first. Technically, of course, a person could first register a Parent profile and then create a Player profile for themselves. This is not a problem since the purpose of separating Parents and Players is not to stop parents from playing, but to allow parents extra control over who their children play the online games with. Since one can only join a Group by invitation, only people who know each other will be in the same Groups. If a child created their own Parent Profile to invite other children to play, they could only do this over their own email and social media accounts, and only children who are allowed to use email and social media will be able to do this.

### Profiles
When registering a Profile, users are asked to pick a Username and a Password. Uniqueness is checked against all already registered Usernames and Passwords. They are offered to enter an email for Notifications, and to opt in or out of browser push Notifications.

<details>
  <summary>Modules (6 Points)</summary>
  <ul>
    <li><b>Major: Standard user management and authentification.</b></li>
    <li><b>Major: Advanced permissions system (user, admin, guest).</b></li>
    <li>Minor: Game statistics and match history</li>
    <li>Minor of own choice: Magic Links and Profile Shortcuts, for Parents and Players</li>
  </ul>
</details>

### Parents
Parents can either join a Group by clicking an Invite Link sent to them on email or social media, or create a new Group. If they created the Group, they are automatically Group Admin, and are asked to name the Group.

Group Admins can:
- Create unique Invite Links to send to other parents.
- Rename the Group.
- Make other Parents in the Group into Group Admins.
- Upload (and Name) a Vocabulary List.
- Rename Vocabulary Lists.
- Make a Vocabulary List the default list for current Games.
- Remove Vocabulary Lists.
- Terminate the Group (all other Group Admins will be requested to agree for termination to proceed).
- Revoke their own Admin status (only if there is at least one other Admin).
(optional)
- Write Group Admin Messages.

All Parents who are members of a Group can:
- Set up a Profile for one or more Players.
- Create a Login Shortcut for their own Players' Profiles, if they want.
- View game Statistics regarding their own Players (only).
- Terminate the Profiles of their own Players.
- Exit the Group.
- Receive Notifications when a Player from one of the Groups they are members of, Initiates a game.
- Toggle Notifications on/off, per Group.
(optional)
- Read the Group Chat. This is where actions affecting the Group are logged, and Group Messages appear.
- Write Group Messages.

The user interface of a Parent will show:
- All Groups which they are members of. Highlights indicate if they are Admin or not, if there is a Call for Action in that Group, and if Notifications are on or off.
- The option to create a New Group.
- Profile Settings, to change Username, Password, Email etc.

Only if they select a Group, can they see, and choose:
- Any Player Profiles they have registered for that Group.
- To register a new Player Profile.
- Group Invitation, which shows a unique url they can Copy.
- Group Settings, which show Group members, Notification status.


<details>
  <summary>Full Action Icon Tree for Parents</summary>
  <b>  Boldface designates actions only available to Admins</b>

  - Requests (pending Requests are displayed as pop up windows)
  - <details>
      <summary>Groups (each Group the user is a member of)</summary>
      <ul>
        <li><details>
          <summary>Players (can be several, each has an icon)</summary>
          <ul>
            <li>Create Login Shortcut</li>
            <li>Player Settings</li>
            <li>Statistics</li>
            <li>Remove Player</li>
          </ul>
        </details></li>
        <li>Create New Player</li>
        <li><details>
          <summary>Group Settings</summary>
          <ul>
            <li>Notifications On/Off</li>
            <li>Leave Group</li>
            <li>Group Members (shows list of all group members)</li>
            <li><b>Rename Group</b></li>
            <li><b>Promote to Admin (sends a Request to another Group member)</b></li>
            <li><b>Terminate Group (sends Request to all Group Admins)</b></li>
            <li><b>Resign as Admin (revokes own Admin status, but only if Group has other Admins)</b></li>
          </ul>
        </details></li>
        <li><details>
          <summary><b>Vocabulary</b></summary>
          <ul>
            <li><b>Upload Vocabulary</b></li>
            <li><b>Rename Vocabulary</b></li>
            <li><b>Remove Vocabulary</b></li>
            <li><b>Make Vocabulary Default</b></li>
          </ul>
        </details></li>
        <li><b>Create Invite (url link that invites someone to join the Group)</b></li>
      </ul> 
    </details> 
  - Create New Group
  - <details>
      <summary>Profile Settings</summary>
      <ul>
        <li>Change Username</li>
        <li>Change Password</li>
        <li>Change Email</li>
        <li>Notifications</li>
      </ul>  
    </details>
</details>



### Players
Players can access their own Profile, either by clicking their own unique Login Shortcut, or by visiting the website and entering username and password.
Players can:
- See which Games are being played by which other Players from the same Group right now.
- See available Games that are not being played.
- See Pending Games waiting for more Players to join.
- Join a pending Game. When enough Players have joined a Pending Game, it starts, and are then displayed as Ongoing instead.
- Initiate an available Game that is not being played at the moment. They are asked if they want to start a single Player Game, or if they want to wait for other Players to join. They can choose how many players to wait for. All Parents in the Group who have opted for this, will receive a notification. The game will appear as Pending, and the number of Players having joined/needing to join, will be displayed as for example "1/4". When the specified number of Players have joined, the Game starts.
- When a Player joins a pending Game, or initiates a new pending Game, a popup window appears, informing them that they are waiting for X more players to join before the Game starts, but that they can press Esc to stop waiting. The mouse is disabled during the wait, but they can still see which other games are being played, are pending etc. This is to stop Players from initiating several games at the same time. If all waiting Players leave a pending Game, it is removed. 


## Vocabulary Lists
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

## Games
Dictee is conceived such, that many Games can be added to the website later. It needs at least one Game.

### Word Building
A crossword is automatically generated that fits on a maximum 24x24 grid. On the tile in front of every word, an arrow is indicating the start of the word. All letters making up the entire list are randomly placed over the grid. The players can direct little trucks around the playing field. They can pick up letters and put them down in other (empty) squares. If they drive over an arrow, the word is read out in audio, and the squares where the word should fit are progressively lit up so that the players can see how long it is. Any square in the word that contains the correct letter lights up in green, empty squares light up in blue, and squares containing the wrong letter light up in red. The players continue building together until the crossword is complete. In the end, each player gets one point per letter that they placed correctly. You can get maximum one point per letter, even if it is removed and replaced several times. The player that first placed it correctly gets the point.

<details>
  <summary>Modules (6 Points)</summary>
  <ul>
    <li><b>Major: Implement a complete web-based real-time multiplayer game.</b></li>
    <li><b>Major: Remote players.</b></li>
    <li><b>Major: Multiplayer game.</b></li>
  </ul>
</details>

### Word soup (optional)
First, the list of words is displayed for a brief while (1 sec per word). Then, a word soup is generated (a grid of 24x24 squares where the words are hidden among other randon letters. Words can cross each other. Words can be displayed horizontally from left to right and vertically from up to down. The player can navigate an arrow across the grid. If they place it on the square where a word begins, points it in the right direction, and inputs the correct number of letters, the word light up and changes color. The Game can be played by several players simultaneously. Each Player has their own color, which shows which words were claimed by which player. The Players gets one point per correct word.

<details>
  <summary>Modules (2 Points)</summary>
  <ul>
    <li><b>Major: Add another Game with user history and matchmaking.</b></li>
  </ul>
</details>