# to do
from tsternbe
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


tsternbe: To enable sending email invites from our app, I set up the following:

@nestjs-modules/mailer with Nodemailer transport and Gmail SMTP

I ran this inside apps/backend

npm install @nestjs-modules/mailer nodemailer
npm install --save-dev @types/nodemailer
npm install @nestjs/config


Gmail account for personal use, Tobias (no last name) my birth date.
dictee.app@gmail.com
gmail password: gek/329-BEX*586?
2 step verification to 0176 7862 1094 (my mobile phone)

App passwords on
name: Dictee
app password: ciyvrpoqnssxqlhy

Things to do:
check uniqueness of userName
check validity of userEmail
check minimum requirements of userPassword

store user, group, vocabulary and players in database (type Member is only used locally)
