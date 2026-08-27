/**
 * QuickCaptureFab — Floating action button for instant capture.
 *
 * Opens a modal/sheet for creating notes, tasks, ideas, reminders.
 * Uses local-first optimistic writes for instant feedback.
 */

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  X,
  FileText,
  CheckSquare,
  Lightbulb,
  Bell,
  Eye,
  Mic,
  Send,
} from '@/lib/icons';

import { AppCard, Section, IconButton } from '@/components/ui/app-shell';
import { useQuickCapture } from '../hooks/useTimeLedger';
import type { QuickCaptureEntry } from '../types';
import { toast } from 'sonner';

const CAPTURE_TYPES = [
  { value: 'note' as const, label: 'ملاحظة', icon: FileText, description: 'فكرة، ملاحظة، تفكير' },
  { value: 'task' as const, label: 'مهمة', icon: CheckSquare, description: 'مهمة يجب إنجازها' },
  { value: 'idea' as const, label: 'فكرة', icon: Lightbulb, description: 'فكرة إبداعية أو مشروع' },
  { value: 'reminder' as const, label: 'تذكير', icon: Bell, description: 'تذكير بوقت محدد' },
  { value: 'observation' as const, label: 'ملاحظة', icon: Eye, description: 'ملاحظة ميدانية' },
] as const;

export default function QuickCaptureFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<QuickCaptureEntry['meta']['captureType']>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isTask, setIsTask] = useState(false);
  const [taskDueAt, setTaskDueAt] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { createCapture, isCreating, createError } = useQuickCapture();

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() && !content.trim()) {
      toast.error('الرجاء إدخال عنوان أو محتوى');
      return;
    }

    try {
      await createCapture({
        title: title.trim() || 'التقاط سريع',
        description: content.trim() || undefined,
        timestamp: new Date().toISOString(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        meta: {
          captureType: selectedType,
          isTask,
          taskCompleted: false,
          taskDueAt: taskDueAt ? new Date(taskDueAt).toISOString() : undefined,
          voiceTranscript: voiceTranscript || '',
        },
      });

      toast.success('تم الحفظ بنجاح');
      resetForm();
      setIsOpen(false);
    } catch (err) {
      console.error('[QuickCaptureFab] Create failed:', err);
      toast.error('فشل الحفظ، يرجى المحاولة مرة أخرى');
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTags('');
    setIsTask(false);
    setTaskDueAt('');
    setVoiceTranscript('');
    setSelectedType('note');
  };

  const handleVoiceStart = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('المتصفح لا يدعم التعرف على الصوت');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setVoiceTranscript(transcript);
      if (!content) setContent(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('[QuickCaptureFab] Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    setIsRecording(true);
    recognition.start();
  };

  const handleVoiceStop = () => {
    setIsRecording(false);
  };

  return (
    <>
      {/* FAB Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 rtl:left-6 rtl:right-auto z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl hover:scale-105 active:scale-95 transition-transform"
        aria-label="التقاط سريع"
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 90 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Plus className="h-7 w-7" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end rtl:justify-start rtl:justify-end sm:items-center sm:justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setIsOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-capture-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-md bg-background rounded-2xl border border-border/30 shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <h2 id="quick-capture-title" className="text-title font-bold text-foreground">التقاط سريع</h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Type Selector */}
                <Section label="نوع الالتقاط" tight>
                  <div className="flex flex-wrap gap-2">
                    {CAPTURE_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setSelectedType(type.value);
                          setIsTask(type.value === 'task');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-micro font-medium border transition-all ${
                          selectedType === type.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'text-muted-foreground border-border/30 hover:border-primary/40 hover:bg-primary/5'
                        }`}
                        aria-pressed={selectedType === type.value}
                      >
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* Title */}
                <div className="space-y-1.5">
                  <label htmlFor="capture-title" className="text-micro font-medium text-muted-foreground">
                    العنوان (اختياري)
                  </label>
                  <input
                    id="capture-title"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="ماذا في بالك؟"
                    className="app-control"
                    maxLength={200}
                  />
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <label htmlFor="capture-content" className="text-micro font-medium text-muted-foreground">
                    المحتوى
                  </label>
                  <textarea
                    id="capture-content"
                    ref={textareaRef}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="اكتب هنا…"
                    className="app-control app-control-multiline"
                    maxLength={5000}
                    rows={6}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <label htmlFor="capture-tags" className="text-micro font-medium text-muted-foreground">
                    الوسوم (مفصولة بفواصل)
                  </label>
                  <input
                    id="capture-tags"
                    type="text"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="عمل، شخصي، فكرة، عاجل…"
                    className="app-control"
                  />
                </div>

                {/* Task Options */}
                {isTask && (
                  <Section label="خيارات المهمة" tight>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label htmlFor="task-due" className="text-micro font-medium text-muted-foreground">
                          تاريخ الاستحقاق
                        </label>
                        <input
                          id="task-due"
                          type="datetime-local"
                          value={taskDueAt}
                          onChange={e => setTaskDueAt(e.target.value)}
                          className="app-control"
                        />
                      </div>
                    </div>
                  </Section>
                )}

                {/* Voice Input */}
                <Section label="الإدخال الصوتي" tight>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={isRecording ? handleVoiceStop : handleVoiceStart}
                      disabled={isCreating}
                      className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border transition-colors ${
                        isRecording
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                          : 'bg-muted/30 border-border/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      <Mic className={`h-5 w-5 ${isRecording ? 'animate-pulse text-rose-500' : ''}`} />
                      <span className="font-medium">{isRecording ? 'جاري التسجيل… اضغط للإيقاف' : 'ابدأ التسجيل الصوتي'}</span>
                    </button>
                    {voiceTranscript && (
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                        <p className="text-micro text-muted-foreground mb-1">النص المسموع:</p>
                        <p className="text-meta text-foreground">{voiceTranscript}</p>
                      </div>
                    )}
                  </div>
                </Section>

                {/* Error */}
                {createError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-micro">
                    {createError.message}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <IconButton
                    type="button"
                    onClick={() => { resetForm(); setIsOpen(false); }}
                    className="h-10 px-4 gap-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="text-mini font-medium">إلغاء</span>
                  </IconButton>
                  <button
                    type="submit"
                    disabled={isCreating || (!title.trim() && !content.trim())}
                    className="flex h-10 gap-2 items-center rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-5 active:scale-95 transition-all text-mini disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                    {isCreating ? 'حفظ…' : 'حفظ'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}