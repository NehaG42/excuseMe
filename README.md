# Excuse Engine

[![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React Native](https://img.shields.io/badge/React_Native-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)](https://openai.com/)

An AI-powered excuse generator app that creates personalized, context-aware excuses for various situations. Built with a FastAPI backend and React Native mobile frontend.

## Features

- **Personalized Excuses**: Tailored based on user profile (name, age, gender)
- **Context Inference**: Automatically detects audience (boss, partner, friend) and tone from scenario descriptions
- **Safety Filters**: Prevents generation of inappropriate or banned content
- **Chat Interface**: Seamless mobile experience with onboarding flow
- **AI-Powered**: Uses OpenAI's GPT-4o-mini for natural language generation

## File Structure

```
excuse-me/
├── backend/
│   ├── main.py          # FastAPI server with excuse generation logic
│   ├── .env             # Environment variables (OpenAI API key)
│   └── __pycache__/     # Python bytecode cache
├── mobile/
│   ├── App.js           # Main React Native app component
│   ├── app.json         # Expo configuration
│   ├── package.json     # Node.js dependencies
│   ├── index.js         # App entry point
│   ├── assets/          # App icons and splash screens
│   └── src/
│       └── config.js    # API configuration
├── esme/                # Python virtual environment
├── requirements.txt     # Python dependencies
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## Prerequisites

- Python 3.12+
- Node.js 18+
- Expo CLI
- OpenAI API key

## Setup Instructions

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment (if not using esme):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r ../requirements.txt
   ```

4. **Set up environment variables:**
   - Create a `.env` file in the `backend/` directory
   - Add your OpenAI API key: `OPENAI_API_KEY=your_key_here`

5. **Run the server:**
   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`

### Mobile App Setup

1. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update API URL (if needed):**
   - Edit `src/config.js` to point to your backend URL
   - Default: `http://192.168.4.24:8000` (adjust for your local IP)

4. **Start the app:**
   ```bash
   npm start
   ```
   - Scan the QR code with Expo Go app
   - Or press 'i' for iOS simulator, 'a' for Android emulator

## Usage

1. **Onboarding**: Enter your name, age, and gender
2. **Chat**: Describe your situation (e.g., "Running late for work meeting")
3. **Receive Excuse**: Get a tailored, natural-sounding excuse

## API Endpoints

- `GET /` - Health check
- `POST /generate` - Generate excuses

### Generate Request Body
```json
{
  "name": "John",
  "age": 28,
  "scenario": "Late for team meeting",
  "gender": "Male"
}
```

### Generate Response
```json
{
  "options": [
    {
      "text": "Caught in unexpected traffic on the way—should be there shortly."
    }
  ]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Author

**Neha Gaonkar**  

- **GitHub**: [https://github.com/NehaG42](https://github.com/NehaG42)  
- **Email**: nehagaonkar001@gmail.com
