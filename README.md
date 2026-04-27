# Smash-Bros-Coaching

A modern, responsive login website for Smash Bros coaching with user roles, admin features, and a sleek UI.

## Features

- **Modern UI**: Gradient backgrounds, glassmorphism effects, smooth animations
- **User Authentication**: Secure login with bcrypt password hashing
- **Role-Based Access**: Classes (Beginner, Intermediate, Advanced, Coach) with tailored recommendations
- **Authority Levels**: Hierarchical permissions (1-5)
- **Admin Panel**: Coaches can manage user classes; super admins can edit authority levels
- **Responsive Design**: Works on desktop and mobile devices
- **Session Management**: Secure user sessions

## Sample Users

All passwords are `password`:

- `admin` - Super admin (authority 5) - Can edit everything
- `coach1` - Coach (authority 4) - Can edit classes only
- `beginner1`, `intermediate1`, `advanced1` - Regular users

## Usage

1. Install dependencies: `npm install`
2. Start the server: `node server.js`
3. Open http://localhost:3000 in your browser
4. Login with sample credentials

## UI Highlights

- **Login Page**: Animated gradient background with floating labels
- **Dashboard**: Card-based layout with user info and personalized recommendations
- **Admin Panel**: Modern table with user avatars and inline editing

## Note

This is a demo application. For production, use a proper database, environment variables for secrets, and additional security measures.
