# ft_transcendence — Majors and Minors

Subject version **21.2**. You need **14 points** to complete the project.

- **Major** = 2 points
- **Minor** = 1 points

Extra modules beyond 14 points can count as bonus (max **5** bonus points), if they are fully functional.

Some modules depend on others. Those notes are listed under the module.

---

## IV.1 Web

### Majors (2 pts)

1. **Use a framework for both the frontend and backend**
   - Frontend framework (React, Vue, Angular, Svelte, etc.)
   - Backend framework (Express, NestJS, Django, Flask, Ruby on Rails, etc.)
   - Full-stack frameworks (Next.js, Nuxt.js, SvelteKit) count as both if you use frontend and backend capabilities
2. **Implement real-time features using WebSockets or similar technology**
   - Real-time updates across clients
   - Handle connection/disconnection gracefully
   - Efficient message broadcasting
3. **Allow users to interact with other users**
   - Basic chat (send/receive messages)
   - Profile system (view user information)
   - Friends system (add/remove friends, see friends list)
4. **Public API** with a secured API key, rate limiting, documentation, and at least 5 endpoints
   - `GET /api/{something}`
   - `POST /api/{something}`
   - `PUT /api/{something}`
   - `DELETE /api/{something}`

### Minors (1 pt)

1. **Use a frontend framework** (React, Vue, Angular, Svelte, etc.)
2. **Use a backend framework** (Express, Fastify, NestJS, Django, etc.)
3. **Use an ORM** for the database
4. **Complete notification system** for all creation, update, and deletion actions
5. **Real-time collaborative features** (shared workspaces, live editing, collaborative drawing, etc.)
6. **Server-Side Rendering (SSR)** for improved performance and SEO
   - Incompatible with the ICP blockchain backend
7. **Progressive Web App (PWA)** with offline support and installability
8. **Custom-made design system** with reusable components, including a proper color palette, typography, and icons (minimum: 10 reusable components)
9. **Advanced search** with filters, sorting, and pagination
10. **File upload and management system**
    - Multiple file types (images, documents, etc.)
    - Client-side and server-side validation (type, size, format)
    - Secure file storage with access control
    - File preview where applicable
    - Progress indicators for uploads
    - Ability to delete uploaded files

---

## IV.2 Accessibility and Internationalization

### Majors (2 pts)

1. **Complete accessibility compliance (WCAG 2.1 AA)** with screen reader support, keyboard navigation, and assistive technologies

### Minors (1 pt)

1. **Support for multiple languages** (at least 3 languages)
   - i18n system
   - At least 3 complete language translations
   - Language switcher in the UI
   - All user-facing text must be translatable
2. **Right-to-left (RTL) language support**
   - At least one RTL language (Arabic, Hebrew, etc.)
   - Complete layout mirroring (not just text direction)
   - RTL-specific UI adjustments where needed
   - Seamless switching between LTR and RTL
3. **Support for additional browsers**
   - Full compatibility with at least 2 additional browsers (Firefox, Safari, Edge, etc.)
   - Test and fix all features in each browser
   - Document any browser-specific limitations
   - Consistent UI/UX across all supported browsers

---

## IV.3 User Management

### Majors (2 pts)

1. **Standard user management and authentication**
   - Users can update their profile information
   - Users can upload an avatar (with a default avatar if none provided)
   - Users can add other users as friends and see their online status
   - Users have a profile page displaying their information
2. **Advanced permissions system**
   - View, edit, and delete users (CRUD)
   - Roles management (admin, user, guest, moderator, etc.)
   - Different views and actions based on user role
3. **Organization system**
   - Create, edit, and delete organizations
   - Add users to organizations
   - Remove users from organizations
   - View organizations and allow users to perform specific actions within an organization (minimum: create, read, update)

### Minors (1 pt)

1. **Game statistics and match history**
   - Track user game statistics (wins, losses, ranking, level, etc.)
   - Display match history (1v1 games, dates, results, opponents)
   - Show achievements and progression
   - Leaderboard integration
   - Requires at least one functional game
2. **Remote authentication with OAuth 2.0** (Google, GitHub, 42, etc.)
3. **Complete 2FA (Two-Factor Authentication)** system
4. **User activity analytics and insights dashboard**

---

## IV.4 Artificial Intelligence

### Majors (2 pts)

1. **AI Opponent for games**
   - Challenging and able to win occasionally
   - Human-like behavior (not perfect play)
   - If game customization exists, the AI must be able to use it
   - Must be explainable during evaluation
   - Requires at least one functional game
2. **Complete RAG (Retrieval-Augmented Generation) system**
   - Interact with a large dataset of information
   - Users can ask questions and get relevant answers
   - Proper context retrieval and response generation
3. **Complete LLM system interface**
   - Generate text and/or images based on user input
   - Handle streaming responses
   - Error handling and rate limiting
4. **Recommendation system using machine learning**
   - Personalized recommendations based on user behavior
   - Collaborative filtering or content-based filtering
   - Continuously improve recommendations over time

### Minors (1 pt)

1. **Content moderation AI** (auto moderation, auto deletion, auto warning, etc.)
2. **Voice/speech integration** for accessibility or interaction
3. **Sentiment analysis** for user-generated content
4. **Image recognition and tagging system**

---

## IV.5 Cybersecurity

### Majors (2 pts)

1. **WAF/ModSecurity (hardened) + HashiCorp Vault for secrets**
   - Configure strict ModSecurity/WAF
   - Manage secrets in Vault (API keys, credentials, environment variables), encrypted and isolated

### Minors (1 pt)

None.

---

## IV.6 Gaming and user experience

Gaming modules (AI Opponent, Tournament, Game customization, Spectator mode, Multiplayer 3+, Add another game) require that at least one game be implemented first.

### Majors (2 pts)

1. **Complete web-based game** where users can play against each other
   - Real-time multiplayer (e.g. Pong, Chess, Tic-Tac-Toe, card games)
   - Live matches
   - Clear rules and win/loss conditions
   - 2D or 3D
2. **Remote players** — two players on separate computers play the same game in real-time
   - Handle network latency and disconnections
   - Smooth remote gameplay
   - Reconnection logic
3. **Multiplayer game (more than two players)**
   - Three or more players simultaneously
   - Fair gameplay mechanics
   - Proper synchronization across all clients
   - Requires at least one functional game
4. **Add another game** with user history and matchmaking
   - Second distinct game
   - Track user history and statistics for this game
   - Matchmaking system
   - Maintain performance and responsiveness
   - Requires a functional first game
5. **Advanced 3D graphics** using a library like Three.js or Babylon.js
   - Immersive 3D environment
   - Advanced rendering techniques
   - Smooth performance and user interaction

### Minors (1 pt)

1. **Advanced chat features** (enhances basic chat from “Allow users to interact”)
   - Block users from messaging you
   - Invite users to play games from chat
   - Game/tournament notifications in chat
   - Access to user profiles from chat
   - Chat history persistence
   - Typing indicators and read receipts
   - Requires the basic chat from the User interaction major
2. **Tournament system**
   - Clear matchup order and bracket system
   - Track who plays against whom
   - Matchmaking for tournament participants
   - Tournament registration and management
   - Requires at least one functional game
3. **Game customization options**
   - Power-ups, attacks, or special abilities
   - Different maps or themes
   - Customizable game settings
   - Default options must be available
   - Requires at least one functional game
4. **Gamification system** to reward users for their actions
   - At least 3 of: achievements, badges, leaderboards, XP/level system, daily challenges, rewards
   - Persistent (stored in database)
   - Visual feedback (notifications, progress bars, etc.)
   - Clear rules and progression mechanics
5. **Spectator mode** for games
   - Watch ongoing games
   - Real-time updates for spectators
   - Optional: spectator chat
   - Requires at least one functional game

---

## IV.7 Devops

### Majors (2 pts)

1. **Log management using ELK** (Elasticsearch, Logstash, Kibana)
   - Elasticsearch to store and index logs
   - Logstash to collect and transform logs
   - Kibana for visualization and dashboards
   - Log retention and archiving policies
   - Secure access to all components
2. **Monitoring system with Prometheus and Grafana**
   - Prometheus to collect metrics
   - Exporters and integrations
   - Custom Grafana dashboards
   - Alerting rules
   - Secure access to Grafana
3. **Backend as microservices**
   - Loosely-coupled services with clear interfaces
   - REST APIs or message queues for communication
   - Each service should have a single responsibility

### Minors (1 pt)

1. **Health check and status page** with automated backups and disaster recovery procedures

---

## IV.8 Data and Analytics

### Majors (2 pts)

1. **Advanced analytics dashboard** with data visualization
   - Interactive charts and graphs (line, bar, pie, etc.)
   - Real-time data updates
   - Export functionality (PDF, CSV, etc.)
   - Customizable date ranges and filters

### Minors (1 pt)

1. **Data export and import**
   - Export in multiple formats (JSON, CSV, XML, etc.)
   - Import with validation
   - Bulk operations support
2. **GDPR compliance features**
   - Users can request their data
   - Data deletion with confirmation
   - Export user data in a readable format
   - Confirmation emails for data operations

---

## IV.9 Blockchain

### Majors (2 pts)

1. **Store tournament scores on the Blockchain**
   - Avalanche and Solidity smart contracts on a test blockchain
   - Smart contracts to record, manage, and retrieve tournament scores
   - Data integrity and immutability

### Minors (1 pt)

1. **Use ICP (Internet Computer Protocol)** for a backend that runs on a blockchain
   - Incompatible with SSR

---

## IV.10 Modules of choice

### Majors (2 pts)

1. **Custom major module** not listed above
   - Substantial, with technical complexity
   - README must justify: why you chose it, technical challenges, value to the project, why it deserves 2 points
   - Trivial features will be rejected
   - Must be relevant to the project

### Minors (1 pt)

1. **Custom minor module** — same as the major, but smaller in scope and less complex
   - Must still demonstrate technical skill and creativity
   - Must add meaningful value
   - Requires README justification (1 point)

---

## Summary

| Category | Majors | Minors | Max points |
| --- | ---: | ---: | ---: |
| Web | 4 | 10 | 18 |
| Accessibility and Internationalization | 1 | 3 | 5 |
| User Management | 3 | 4 | 10 |
| Artificial Intelligence | 4 | 4 | 12 |
| Cybersecurity | 1 | 0 | 2 |
| Gaming and user experience | 5 | 5 | 15 |
| Devops | 3 | 1 | 7 |
| Data and Analytics | 1 | 2 | 4 |
| Blockchain | 1 | 1 | 3 |
| Modules of choice | 1 | 1 | 3 |
| **Total** | **24** | **31** | **79** |

Required to pass: **14 points**. Bonus cap: **5 points** beyond that.
