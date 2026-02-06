import React, { useState, useEffect, useMemo } from 'react';
import { User, Note, AppView } from './types';
import { 
  registerUser, 
  loginUser, 
  getSessionUser, 
  logoutUser, 
  getNotes, 
  saveNote, 
  deleteNote 
} from './services/storageService';
import { IOSButton, IOSInput, IOSCard, IOSModal } from './components/IOSComponents';
import { Icons } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.AUTH);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Auth State
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Editor State
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // List State
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
      }
    };
    initSession();
  }, []);

  const loadNotes = async (userId: string) => {
    const userNotes = await getNotes(userId);
    setNotes(userNotes);
  };

  // --- Helper: Date Grouping ---
  const groupedNotes = useMemo(() => {
    if (!notes.length) return {};
    
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const isSameDay = (d1: Date, d2: Date) => 
      d1.getDate() === d2.getDate() && 
      d1.getMonth() === d2.getMonth() && 
      d1.getFullYear() === d2.getFullYear();

    const groups: { [key: string]: Note[] } = {
      'Today': [],
      'Yesterday': [],
      'Previous 30 Days': [],
      'Older': []
    };

    const filtered = notes.filter(n => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    });

    filtered.forEach(note => {
      const date = new Date(note.updated_at);
      if (isSameDay(date, today)) {
        groups['Today'].push(note);
      } else if (isSameDay(date, yesterday)) {
        groups['Yesterday'].push(note);
      } else if (today.getTime() - date.getTime() < 30 * 24 * 60 * 60 * 1000) {
        groups['Previous 30 Days'].push(note);
      } else {
        groups['Older'].push(note);
      }
    });

    return groups;
  }, [notes, searchQuery]);

  // --- Helpers: Stats ---
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
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
          if (error && error.includes('check your email')) {
             setAuthSuccess(error);
             setAuthMode('login'); 
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
      setAuthError('Connection failed.');
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
  };

  const createNewNote = () => {
    setSelectedNote(null);
    setEditorTitle('');
    setEditorContent('');
    setCurrentView(AppView.EDITOR);
  };

  const saveCurrentNote = async (shouldExit = false) => {
    if (!currentUser) return;
    
    // Auto-title if empty but content exists
    let titleToSave = editorTitle.trim();
    const contentToSave = editorContent;

    if (!titleToSave && !contentToSave.trim()) {
       if (shouldExit) setCurrentView(AppView.LIST);
       return;
    }

    if (!titleToSave && contentToSave) {
        // Grab first few words as title
        titleToSave = contentToSave.split('\n')[0].substring(0, 30) || 'New Note';
    } else if (!titleToSave) {
        titleToSave = 'New Note';
    }

    setIsSaving(true);
    try {
      const noteToSave: Note = {
        id: selectedNote ? selectedNote.id : crypto.randomUUID(),
        user_id: currentUser.id,
        title: titleToSave,
        content: contentToSave,
        updated_at: new Date().toISOString()
      };

      await saveNote(noteToSave);
      await loadNotes(currentUser.id); // Refresh list
      
      if (shouldExit) {
        setCurrentView(AppView.LIST);
      } else {
        // If just saving (e.g. auto-save logic later), update selected note so we don't create dupes
        setSelectedNote(noteToSave);
      }
    } catch (e: any) {
      alert(`Failed to save: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCurrentNote = async () => {
    if (selectedNote && currentUser) {
      if (confirm('Are you sure you want to delete this note?')) {
        await deleteNote(selectedNote.id);
        await loadNotes(currentUser.id);
        setCurrentView(AppView.LIST);
      }
    } else {
        // Just discard new note
        setCurrentView(AppView.LIST);
    }
  };

  const handleBack = () => {
      saveCurrentNote(true);
  };

  // --- Views ---

  const renderAuth = () => (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F2F2F7]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -left-[10%] w-[70vh] h-[70vh] rounded-full bg-blue-400/20 blur-[100px]" />
            <div className="absolute bottom-[0%] right-[0%] w-[50vh] h-[50vh] rounded-full bg-yellow-400/20 blur-[100px]" />
        </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-xl mb-6">
                <span className="text-4xl">📝</span>
            </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">NotesAI</h1>
          <p className="text-gray-500 mt-2 font-medium">Think better. Write faster.</p>
        </div>

        <div className="glass-panel rounded-3xl p-8 shadow-glass border border-white/50">
          <form onSubmit={handleAuth} className="space-y-5">
            <IOSInput 
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@example.com"
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
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                 {authError}
              </div>
            )}
            
            {authSuccess && (
              <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl">
                 {authSuccess}
              </div>
            )}

            <div className="pt-4">
              <IOSButton type="submit" fullWidth disabled={isLoadingAuth} variant="primary" className="shadow-lg shadow-yellow-500/20">
                {isLoadingAuth ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (authMode === 'login' ? 'Log In' : 'Create Account')}
              </IOSButton>
            </div>
          </form>
        </div>

        <div className="text-center mt-8">
          <button 
            type="button"
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'signup' : 'login');
              setAuthError('');
            }}
            className="text-ios-gray hover:text-ios-blue text-sm font-semibold transition-colors"
          >
            {authMode === 'login' ? "New here? Create an account" : "Have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="min-h-screen bg-[#F2F2F7]">
      {/* Navigation Bar */}
      <div className="sticky top-0 z-30 bg-[#F2F2F7]/95 backdrop-blur-xl border-b border-gray-200/50 pt-safe-top">
         <div className="flex justify-between items-center px-4 py-3">
             <button onClick={handleLogout} className="text-ios-blue text-sm font-medium hover:opacity-70">
                 Sign Out
             </button>
             <button className="p-2 bg-white rounded-full shadow-sm text-ios-yellow hover:bg-gray-50">
                 <Icons.MoreCircle className="w-5 h-5" />
             </button>
         </div>
         <div className="px-5 pb-4">
             <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Notes</h1>
             
             {/* Search Bar */}
             <div className="mt-4 relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icons.Search className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-[#E3E3E8] rounded-xl leading-5 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-ios-yellow/50 transition-all duration-200 sm:text-sm"
                />
              </div>
         </div>
      </div>

      {/* Notes List */}
      <div className="px-4 pb-24 pt-2">
        {Object.keys(groupedNotes).map(group => {
            const groupNotes = groupedNotes[group];
            if (groupNotes.length === 0) return null;

            return (
                <div key={group} className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-3 px-1">{group}</h2>
                    <div className="space-y-3">
                        {groupNotes.map(note => (
                            <IOSCard 
                                key={note.id} 
                                onClick={() => openNote(note)}
                                className="flex flex-col gap-1.5 active:scale-[0.98] transition-transform"
                            >
                                <h3 className="font-semibold text-gray-900 line-clamp-1 text-lg">
                                    {note.title || <span className="text-gray-400 italic">No Title</span>}
                                </h3>
                                <div className="flex items-start gap-2">
                                    <span className="text-sm text-gray-400 whitespace-nowrap min-w-fit">
                                        {new Date(note.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                                        {note.content || <span className="opacity-50">No additional text</span>}
                                    </p>
                                </div>
                            </IOSCard>
                        ))}
                    </div>
                </div>
            );
        })}
        
        {notes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mb-4">
                    <Icons.Plus className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-lg font-medium text-gray-500">No Notes Yet</p>
            </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-8 right-6 z-40">
        <button 
          onClick={createNewNote}
          className="bg-ios-yellow text-black w-14 h-14 rounded-full shadow-lg shadow-orange-500/20 flex items-center justify-center hover:brightness-105 active:scale-90 transition-all duration-300"
        >
          <Icons.Plus className="w-8 h-8 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-slide-up">
      {/* Editor Header */}
      <div className="px-4 py-3 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-100 z-10 sticky top-0">
        <button 
          onClick={handleBack}
          className="flex items-center text-ios-yellow font-semibold text-base -ml-2 px-2 py-2 hover:opacity-70 transition-opacity active:scale-95"
        >
          <Icons.ChevronLeft className="w-7 h-7 mr-0.5" />
          Notes
        </button>
        
        <div className="flex items-center gap-2">
          <button 
             onClick={() => {
                 const link = window.location.href;
                 navigator.clipboard.writeText(`${link} (Note: ${editorTitle})`);
                 alert("Link copied to clipboard!");
             }}
             className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
          >
             <Icons.Share className="w-5 h-5" />
          </button>
          <button 
            onClick={deleteCurrentNote}
            className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
          >
            <Icons.Trash className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Editor Canvas */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="max-w-3xl mx-auto px-6 py-8 pb-32 min-h-full">
            <input
              value={editorTitle}
              onChange={(e) => setEditorTitle(e.target.value)}
              placeholder="Title"
              className="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none bg-transparent mb-6"
            />
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              placeholder="Start typing..."
              className="w-full h-full min-h-[50vh] resize-none text-lg text-gray-800 placeholder-gray-300 border-none outline-none bg-transparent leading-relaxed font-normal"
              spellCheck={false}
            />
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 px-4 py-3 pb-safe-bottom z-20">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
             
             {/* Stats */}
             <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                 {getWordCount(editorContent)} words
             </div>

             {/* Time */}
             <div className="text-right">
                 <span className="text-xs text-gray-300">
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                 </span>
             </div>
          </div>
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