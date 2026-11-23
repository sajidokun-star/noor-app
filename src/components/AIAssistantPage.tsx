import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { AppPersistedState, AssistantChatMessage, AssistantReference } from '../types/islamic';
import type { AppRoute } from '../utils/routes';
import { t } from '../utils/i18n';
import { PageHeader } from './PageHeader';

const STARTER_PROMPTS = [
  {
    en: 'What does the Quran say about patience during hardship?',
    bn: 'কঠিন সময়ে ধৈর্য ধারণ সম্পর্কে কুরআনে কী বলা হয়েছে?',
  },
  {
    en: 'How can I build focus (Khushu) in daily Salah?',
    bn: 'নামাজে মনোযোগ ও খুশু বাড়ানোর সুন্নাহ উপায় কী?',
  },
  {
    en: 'What is the reward of seeking forgiveness (Istighfar)?',
    bn: 'নিয়মিত ইস্তিগফার পাঠের ফজিলত কুরআন ও হাদীসে কী এসেছে?',
  },
];

export const AIAssistantPage: React.FC<{
  state: AppPersistedState;
  onNavigate: (route: AppRoute) => void;
}> = ({ state, onNavigate }) => {
  const lang = state.language;
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);

  const submitQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    const userMsg: AssistantChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/islamic-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          language: lang,
          history: messages.slice(-4).map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const data = (await res.json()) as {
        answer?: string;
        references?: AssistantReference[];
        scholarAdvice?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(
          data.error ||
            t(
              lang,
              'Could not reach the Islamic Assistant service.',
              'ইসলামিক অ্যাসিস্ট্যান্ট সার্ভিসের সাথে সংযোগ করা যায়নি।'
            )
        );
      }

      const botMsg: AssistantChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: data.answer || '',
        references: Array.isArray(data.references) ? data.references : [],
        scholarAdvice: data.scholarAdvice,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errText =
        err instanceof Error
          ? err.message
          : t(lang, 'Request failed.', 'অনুরোধ সম্পন্ন করা যায়নি।');
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: errText,
          error: true,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 w-full max-w-4xl mx-auto overflow-x-hidden">
      <PageHeader
        lang={lang}
        title={t(lang, 'Islamic Learning Assistant', 'ইসলামিক জ্ঞান অ্যাসিস্ট্যান্ট')}
        subtitle={t(
          lang,
          'Ask questions in English, Bengali, or Arabic — strictly grounded in verified Quran & Hadith references.',
          'বাংলা, ইংরেজি বা আরবিতে প্রশ্ন করুন — কেবল কুরআন ও সহীহ হাদীসের দলিলভিত্তিক উত্তর।'
        )}
        onNavigate={onNavigate}
      />

      {/* Permanent Scholarly Disclaimer */}
      <div
        data-testid="ai-scholar-disclaimer"
        className="rounded-2xl bg-amber-500/10 border border-amber-500/35 p-4 flex items-start gap-3"
      >
        <ShieldAlert
          className="w-5 h-5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="space-y-1 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
          <p className="font-semibold text-amber-800 dark:text-amber-200">
            {t(lang, 'Educational Guidance & Scholarly Disclaimer', 'শরয়ী ও আলেম পরামর্শ নির্দেশিকা')}
          </p>
          <p>
            {t(
              lang,
              'This assistant summarizes verified Quran verses and authentic Hadith for educational learning only. It does not issue Fatwas; please consult qualified local scholars (Ulama / Mufti) for complex or personal Fiqh rulings.',
              'এই অ্যাসিস্ট্যান্টটি কেবল শিক্ষামূলক উদ্দেশ্যে যাচাইকৃত কুরআন ও সহীহ হাদীসের তথ্য উপস্থাপন করে। এটি কোনো ফতোয়া প্রদান করে না; ব্যক্তিগত বা জটিল মাসআলার জন্য অবশ্যই বিজ্ঞ আলেম ও মুফতির পরামর্শ গ্রহণ করুন।'
            )}
          </p>
        </div>
      </div>

      {/* Chat Conversation Feed */}
      <section className="rounded-3xl bg-white/90 dark:bg-[#09090B] backdrop-blur-md border border-stone-200/80 dark:border-white/10 p-4 sm:p-6 space-y-5 min-h-[340px] flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(16,24,40,0.06)] dark:shadow-none">
        {messages.length === 0 ? (
          <div className="py-6 space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-zinc-900 dark:text-white">
                {t(lang, 'Assalamu Alaikum! How can I help you learn today?', 'আসসালামু আলাইকুম! আজ কোন বিষয়ে জানতে চান?')}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t(
                  lang,
                  'Choose a question below or type your own in Bengali, English, or Arabic.',
                  'নিচের একটি প্রশ্ন বেছে নিন অথবা বাংলা, ইংরেজি বা আরবিতে আপনার প্রশ্ন লিখুন।'
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
              {STARTER_PROMPTS.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => submitQuestion(lang === 'bn' ? item.bn : item.en)}
                  className="rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 hover:border-emerald-500/45 p-3.5 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed transition-colors"
                >
                  {lang === 'bn' ? item.bn : item.en}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[85%] rounded-2xl bg-emerald-500 text-black px-4 py-3 text-sm font-medium">
                    {msg.text}
                  </div>
                ) : msg.error ? (
                  <div className="w-full rounded-2xl bg-red-500/10 border border-red-500/35 p-4 space-y-2">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300 inline-flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" aria-hidden="true" />
                      {t(lang, 'Assistant Unavailable', 'সেবা সাময়িকভাবে অনুপলব্ধ')}
                    </p>
                    <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200">{msg.text}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onNavigate('quran')}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                      >
                        {t(lang, 'Open Al-Quran', 'আল-কুরআন দেখুন')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('hadith')}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-black border border-black/10 dark:border-white/15 text-xs font-medium text-amber-700 dark:text-amber-300"
                      >
                        {t(lang, 'Browse Hadith', 'হাদীস সংকলন')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-4 sm:p-5 space-y-3.5">
                    <p className="text-sm sm:text-[15px] text-zinc-900 dark:text-zinc-100 leading-relaxed whitespace-pre-line">
                      {msg.text}
                    </p>

                    {msg.references && msg.references.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-stone-200/70 dark:border-white/10">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                          {t(lang, 'Verified Sources & Citations', 'যাচাইকৃত কুরআন ও হাদীস সূত্র')}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.references.map((ref, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl bg-white/90 dark:bg-[#09090B] border border-stone-200/80 dark:border-white/10 p-3 space-y-1"
                            >
                              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                                {ref.citation}
                              </p>
                              {ref.excerpt && (
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                  {ref.excerpt}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.scholarAdvice && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-500 shrink-0" aria-hidden="true" />
                        <span>{msg.scholarAdvice}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/10 p-4 text-xs text-zinc-500 dark:text-zinc-400">
                {t(
                  lang,
                  'Checking verified Quran & Hadith references...',
                  'কুরআন ও সহীহ হাদীসের দলিল যাচাই করা হচ্ছে...'
                )}
              </div>
            )}
          </div>
        )}

        {/* Question Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuestion(input);
          }}
          className="pt-4 border-t border-stone-200/70 dark:border-white/10 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t(
              lang,
              'Ask an Islamic question (EN / বাংলা / العربية)...',
              'ইসলামিক প্রশ্ন লিখুন (বাংলা / English / العربية)...'
            )}
            aria-label={t(lang, 'Ask an Islamic question', 'ইসলামিক প্রশ্ন লিখুন')}
            className="flex-1 min-w-0 h-11 px-4 rounded-2xl bg-[#F7F4EC] dark:bg-black border border-stone-200/80 dark:border-white/15 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            data-testid="ai-send-btn"
            className="h-11 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 text-black font-semibold text-xs inline-flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>{t(lang, 'Ask', 'জিজ্ঞাসা করুন')}</span>
          </button>
        </form>
      </section>
    </div>
  );
};
