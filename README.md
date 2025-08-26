**MealMaster is a full-stack recipe manager that streamlines cooking and planning. It lets users create and edit recipes with images, auto-scale ingredient quantities, plan meals, and generate shopping lists, all backed by a secure API with per-user ownership. The frontend is an Angular Material app, and the backend is an Express + MongoDB API that stores images inline and serves them via streaming for fast, reliable display.**





Prereqs

Node 18+, npm

MongoDB running locally

Angular CLI: npm i -g @angular/cli

Backend

cd backend && cp .env.example .env

Edit .env (MONGODB_URI, JWT_SECRET, PORT=4000)

npm i && npm run dev

Frontend

cd frontend && npm i

npm start

Open http://localhost:4200
