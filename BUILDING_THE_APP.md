# Structure

## File system
at the top level, you find apps/ where both frontend and backend files are, and scripts/ where the developer script is. To start the app in developer mode, run ./dev-local.sh 
Then you can edit frontend and backend and see changes while it is running. The app opens in localhost:/3000
Changes to frontend will be instantly seen. No need to restart.
If you change anything to backend, you need to Ctrl-C and then run the script again.

### Front End
Don't touch the files directly under frontend. All files to edit are under app/
/app has directories and files. The files 
- page.tsx is the landing page, where broweser will start
- layout.tsx defines layout for all pages under this page in the page hierarchy. It defines that we use a top-bar, language context and auth context. All pages below in hierarchy are wrapped in these two contexts.
- types.ts defines the objects we use to store data on the front end. Note that they all lack password. This is because the same objects are also stored in backend, but then also with password. Passwords are only stored in backend.
- global.css defines styling
The rest is contained in directories. Most directories are pages. But the following are not:
- components has those components which appear on several places in the app
- context has auth-context that stores login status etc for the current session, and language-context that handles which language is choosen for displaying the content. We haven't implemented this yet. The app will know which language you have selected (from English, German and French) but all text is in English. 
- The other directories all represent pages in the website. Inside each dir is a page.tsx that is the page next.js will open. It has to be names exactly this. The next.js navigation is relying on the dir name. Also we have a subdir _components that contains all components that are local for this page, such as all the buttons that trigger specific funstions, but also lists to show for example Members, Vocabularies or Players. Thanks to extracting all functionality into these components, the page.tsx file remains simple. It is basically a layout scaffolding for the page.

### Back End
In backend, the only folder we touch is src/
In it we have folders for all services that exchange data between frontend and backend. For example, groups/ has all the backend functionality for handling groups. Inside each of these dirs, are three files
- xxxx.module.ts defines the module. It sets which other modules are imported, it defines exports and providers.
- xxxx.controller.ts handles http requests and routes them to the correct service method. This is the entrypoint for API endpoints from the frontend. It defines what actions can be performed. Controllers are either POST (an action is performed on the backend data) or a GET (a query about backend data).
- xxxx.service.ts is where the actual work—such as creating, updating, or fetching data—happens.
At the same level as these different service dirs, are also app.module.ts app.controller.ts app.service.ts and app.controller.spec.ts
app.contoller.ts is the root module of the application. It serves as the entry point for NestJS to understand the structure, dependencies, and configuration of the entire application. The imports are important. Each other service needs to be imported here to be visible by NestJS.

## Workflow
Typically, when adding a new functionality, it goes something like this.
1. Locate the frontend page where the button should be.
2. add import at the top of page.tsx
    import ActionWhat from './_components/action-what';
3. add button in list of buttons in page.tsx
    <ActionWhat onAction={handleAction} />
4. add handler in list of handlers in page.tsx
    const handleAction = (what: What) => {
        functionality...;
    };
5. if the action opens a new page, then create dir, page.tsx and _components in the list of other pages.
    action_what/page.tsx
6. go to backend. Adapt xxx.service.ts and xxx.controller.ts in necessary dirs, for example groups if action gets or posts data about groups.

## To Do
Things that still needs to be done

### User Settings
button in dashboard. Change username, change password, change email, toggle notifications on/off

### Chat
enable admins writing messages to the group and/or to the other group admins. Enable members writing to the group admins

### Select game
a dashboard with the following options: 
- 



