import React, { useState, useEffect, useMemo } from 'react';
import { User, Note, AppView, AIActionType } from './types';
import { 
  registerUser, 
  loginUser, 
  getSessionUser, 
  logoutUser, 
  getNotes, 
  saveNote, 
  deleteNote 
} from './services/storageService';
import { processNoteWithAI } from './services/geminiService';
import { IOSButton, IOSInput, IOSCard } from './components/IOSComponents';
import { Icons } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.AUTH);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Auth State
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState(''); // Changed from username to email
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState(''); // New state for success messages
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Editor State
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // --- Initialization ---
  useEffect(() => {
    const initSession = async () => {
      try {
        const user = await getSessionUser();
        if (user) {
          setCurrentUser(user);
          await loadNotes(user.id);
          setCurrentView(AppView.LIST);
        }
      } catch (err) {
        console.error("Failed to initialize app session:", err);
        // We silently fail here and let the user land on the auth screen
        // rather than crashing the entire React tree.
      }
    };
    initSession();
  }, []);

  const loadNotes = async (userId: string) => {
    const userNotes = await getNotes(userId);
    setNotes(userNotes);
  };

  // --- Auth Handlers ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsLoadingAuth(true);
    
    if (!email || !password) {
      setAuthError('Please fill in all fields');
      setIsLoadingAuth(false);
      return;
    }

    try {
      if (authMode === 'signup') {
        const { user, error } = await registerUser(email, password);
        if (user) {
          handleLoginSuccess(user);
        } else {
          // If error mentions checking email, it's actually a success state for UI purposes,
          // but we stay on the auth screen.
          if (error && error.includes('check your email')) {
             setAuthSuccess(error);
             setAuthMode('login'); // Switch to login mode so they can login after confirming
             setEmail('');
             setPassword('');
          } else {
             setAuthError(error || 'Registration failed');
          }
        }
      } else {
        const { user, error } = await loginUser(email, password);
        if (user) {
          handleLoginSuccess(user);
        } else {
          setAuthError(error || 'Invalid credentials');
        }
      }
    } catch (err) {
      setAuthError('An unexpected error occurred. Please check your connection.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    await loadNotes(user.id);
    setCurrentView(AppView.LIST);
    setEmail('');
    setPassword('');
    setAuthError('');
    setAuthSuccess('');
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setNotes([]);
    setCurrentView(AppView.AUTH);
  };

  // --- Note Operations ---
  const openNote = (note: Note) => {
    setSelectedNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setCurrentView(AppView.EDITOR);
    setAiMenuOpen(false);
  };

  const createNewNote = () => {
    setSelectedNote(null);
    setEditorTitle('');
    setEditorContent('');
    setCurrentView(AppView.EDITOR);
    setAiMenuOpen(false);
  };

  const saveCurrentNote = async () => {
    if (!currentUser) return;
    
    // If empty, just go back without saving
    if (!editorTitle.trim() && !editorContent.trim()) {
        setCurrentView(AppView.LIST);
        return;
    }

    setIsSaving(true);
    try {
      const noteToSave: Note = {
        id: selectedNote ? selectedNote.id : crypto.randomUUID(),
        user_id: currentUser.id,
        title: editorTitle || 'New Note',
        content: editorContent,
        updated_at: new Date().toISOString()
      };

      await saveNote(noteToSave);
      await loadNotes(currentUser.id);
      setCurrentView(AppView.LIST);
    } catch (e: any) {
      alert(`Failed to save note: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCurrentNote = async () => {
    if (selectedNote && currentUser) {
      await deleteNote(selectedNote.id);
      await loadNotes(currentUser.id);
    }
    setCurrentView(AppView.LIST);
  };

  // --- AI Handlers ---
  const handleAIAction = async (action: AIActionType) => {
    if (!editorContent) return;
    
    setIsProcessingAI(true);
    setAiMenuOpen(false);
    
    try {
      const result = await processNoteWithAI(editorContent, action);
      setEditorContent(result);
    } catch (err) {
      alert("AI processing failed. Check your API key.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  // --- Filtering ---
  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    const lowerQ = searchQuery.toLowerCase();
    return notes.filter(n => 
      n.title.toLowerCase().includes(lowerQ) || 
      n.content.toLowerCase().includes(lowerQ)
    );
  }, [notes, searchQuery]);

  // --- Views ---

  const renderAuth = () => (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ios-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">NotesAI</h1>
          <p className="text-gray-500">Secure cloud notes with Gemini.</p>
        </div>

        <IOSCard className="mb-6">
          <form onSubmit={handleAuth} className="space-y-4">
            <IOSInput 
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={isLoadingAuth}
            />
            <IOSInput 
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoadingAuth}
            />
            
            {authError && (
              <p className="text-ios-red text-sm text-center font-medium">{authError}</p>
            )}

            {authSuccess && (
              <p className="text-green-600 text-sm text-center font-medium bg-green-50 p-2 rounded-lg border border-green-100">
                {authSuccess}
              </p>
            )}

            <div className="pt-2">
              <IOSButton type="submit" fullWidth disabled={isLoadingAuth}>
                {isLoadingAuth ? 'Please wait...' : (authMode === 'login' ? 'Log In' : 'Sign Up')}
              </IOSButton>
            </div>
          </form>
        </IOSCard>

        <div className="text-center">
          <button 
            type="button"
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'signup' : 'login');
              setAuthError('');
              setAuthSuccess('');
            }}
            className="text-ios-blue text-sm font-semibold hover:underline"
            disabled={isLoadingAuth}
          >
            {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="min-h-screen bg-ios-background pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-ios-background/80 backdrop-blur-xl border-b border-gray-200/50 pt-12 pb-2 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Notes</h1>
            <button 
              onClick={handleLogout} 
              className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-colors"
            >
              <Icons.LogOut className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icons.Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 bg-gray-200/50 rounded-lg leading-5 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-0 transition duration-150 ease-in-out sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <p className="text-xl font-medium text-gray-400">No notes yet</p>
            <p className="text-sm text-gray-400 mt-2">Tap the + button to create one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredNotes.map(note => (
              <IOSCard key={note.id} onClick={() => openNote(note)} className="h-48 flex flex-col justify-between group hover:shadow-lg transition-shadow">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{note.title}</h3>
                  <p className="text-gray-500 text-sm line-clamp-4 leading-relaxed">
                    {note.content || <span className="italic opacity-50">No content</span>}
                  </p>
                </div>
                <div className="text-xs text-gray-400 font-medium pt-4 border-t border-gray-100 mt-2">
                  {new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </IOSCard>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <button 
          onClick={createNewNote}
          className="bg-ios-blue text-white w-14 h-14 rounded-full shadow-lg shadow-ios-blue/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          <Icons.Plus className="w-8 h-8" />
        </button>
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className="min-h-screen bg-white flex flex-col h-screen overflow-hidden">
      {/* Editor Header */}
      <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100 bg-white/90 backdrop-blur-md z-10">
        <button 
          onClick={saveCurrentNote}
          disabled={isSaving}
          className="flex items-center text-ios-blue font-medium text-base hover:opacity-70 transition-opacity -ml-2 px-2 py-1 disabled:opacity-50"
        >
          <Icons.ChevronLeft className="w-6 h-6 mr-0.5" />
          {isSaving ? 'Saving...' : 'Notes'}
        </button>
        
        <div className="flex gap-2">
           {/* AI Menu Trigger */}
          <div className="relative">
            <button 
              onClick={() => setAiMenuOpen(!aiMenuOpen)}
              className="p-2 text-ios-blue hover:bg-blue-50 rounded-full transition-colors"
              title="AI Tools"
            >
              <Icons.Sparkles className="w-5 h-5" />
            </button>
            
            {aiMenuOpen && (
               <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-50 flex flex-col gap-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                  <button 
                    onClick={() => handleAIAction(AIActionType.FIX_GRAMMAR)}
                    disabled={isProcessingAI}
                    className="flex items-center w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    Fix Grammar
                  </button>
                  <button 
                    onClick={() => handleAIAction(AIActionType.SUMMARIZE)}
                    disabled={isProcessingAI}
                    className="flex items-center w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    Summarize (Replace)
                  </button>
                  <button 
                    onClick={() => handleAIAction(AIActionType.CONTINUE_WRITING)}
                    disabled={isProcessingAI}
                    className="flex items-center w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  >
                    Continue Writing
                  </button>
               </div>
            )}
          </div>

          <button 
            onClick={deleteCurrentNote}
            className="p-2 text-ios-red hover:bg-red-50 rounded-full transition-colors"
          >
            <Icons.Trash className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Loading Overlay for AI */}
      {isProcessingAI && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white shadow-xl rounded-2xl p-4 flex items-center gap-3">
               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-ios-blue"></div>
               <span className="text-gray-600 font-medium">Gemini is thinking...</span>
            </div>
        </div>
      )}

      {/* Inputs */}
      <div className="flex-1 overflow-y-auto p-5 max-w-3xl mx-auto w-full">
        <input
          value={editorTitle}
          onChange={(e) => setEditorTitle(e.target.value)}
          placeholder="Title"
          className="w-full text-3xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none bg-transparent mb-4"
        />
        <textarea
          value={editorContent}
          onChange={(e) => setEditorContent(e.target.value)}
          placeholder="Start typing..."
          className="w-full h-[calc(100%-80px)] resize-none text-lg text-gray-800 placeholder-gray-300 border-none outline-none bg-transparent leading-relaxed"
        />
      </div>
    </div>
  );

  return (
    <>
      {currentView === AppView.AUTH && renderAuth()}
      {currentView === AppView.LIST && renderList()}
      {currentView === AppView.EDITOR && renderEditor()}
    </>
  );
};

export default App;