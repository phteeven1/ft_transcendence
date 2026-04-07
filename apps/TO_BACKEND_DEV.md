# to do

## context backend
I have implemented react contexts in the frontend. 
### langauge-context
I have built a flag menu that can switch between english, french and german. I wanted it in the architecture at this stage, but let's only implement it later. My thougt is, that different text snippets should be loaded and used for titles and text depending on language.
### auth-context
I have implemented auth-context in the frontend. I had to do this to get going, since so much of the initial page building is about user, password, group etc. I use auth only in frontend, and have left placeholders in the code for saving userName, userPassword and userEmail to backend. Also, my pages don't check if userName and userPassword are correct. This would be a good backend task for now.

## remove counter
if counter on the landing page doesn't serve a purpose, it can be removed

# questions
## tailwind
We currently use two styling schemas. I suggest we switch to, and stick with, only tailwind. I suggest we use a very simple aestetic for now, and work more on it later.