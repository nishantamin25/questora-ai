interface Translation {
  [key: string]: string;
}

interface LanguageData {
  code: string;
  name: string;
  nativeName: string;
  translations: Translation;
}

class LanguageServiceClass {
  private currentLanguage: string = 'en';
  private languages: Record<string, LanguageData> = {
    en: {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      translations: {
        // Navigation
        'nav.dashboard': 'Dashboard',
        'nav.responses': 'Responses',
        'nav.leaderboard': 'Leaderboard',
        'nav.logout': 'Logout',
        'nav.settings': 'Settings',
        
        // Settings
        'settings.title': 'Settings',
        'settings.language': 'Language',
        'settings.apiKey': 'API Key Setup',
        'settings.close': 'Close',
        'settings.save': 'Save',
        
        // API Key
        'apiKey.setup': 'Setup API Key',
        'apiKey.update': 'Update API Key',
        'apiKey.clear': 'Clear Key',
        'apiKey.success': 'OpenAI API key has been saved successfully',
        'apiKey.cleared': 'OpenAI API key has been removed',
        
        // Common
        'common.generate': 'Generate Content',
        'common.generating': 'Generating...',
        'common.submit': 'Submit',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        
        // Dashboard
        'dashboard.welcome': 'Welcome',
        'dashboard.admin': 'admin',
        'dashboard.guest': 'guest',
        'dashboard.generateContent': 'Generate Content',
        'dashboard.describeContent': 'Describe your content',
        'dashboard.availableTests': 'Available Tests',
        'dashboard.howToAnswer': 'How to Answer',
        'dashboard.noTests': 'No active tests available',
        'dashboard.noTestsDesc': 'No active tests have been published yet',
        
        // Questions
        'question.selectAnswer': 'Select answers',
        'question.submitResponse': 'Submit responses',
        'question.answerAll': 'Answer all questions to enable the submit button at the bottom of each questionnaire.',
      }
    },
    hi: {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिंदी',
      translations: {
        'nav.dashboard': 'डैशबोर्ड',
        'nav.responses': 'जवाब',
        'nav.leaderboard': 'लीडरबोर्ड',
        'nav.logout': 'लॉग आउट',
        'nav.settings': 'सेटिंग्स',
        
        'settings.title': 'सेटिंग्स',
        'settings.language': 'भाषा',
        'settings.apiKey': 'API की सेटअप',
        'settings.close': 'बंद करें',
        'settings.save': 'सहेजें',
        
        'apiKey.setup': 'API की सेटअप करें',
        'apiKey.update': 'API की अपडेट करें',
        'apiKey.clear': 'की साफ़ करें',
        'apiKey.success': 'OpenAI API की सफलतापूर्वक सहेजी गई है',
        'apiKey.cleared': 'OpenAI API की हटा दी गई है',
        
        'common.generate': 'सामग्री उत्पन्न करें',
        'common.generating': 'उत्पन्न कर रहे हैं...',
        'common.submit': 'जमा करें',
        'common.cancel': 'रद्द करें',
        'common.save': 'सहेजें',
        'common.delete': 'हटाएं',
        'common.edit': 'संपादित करें',
        
        'dashboard.welcome': 'स्वागत है',
        'dashboard.admin': 'व्यवस्थापक',
        'dashboard.guest': 'अतिथि',
        'dashboard.generateContent': 'सामग्री उत्पन्न करें',
        'dashboard.describeContent': 'अपनी सामग्री का वर्णन करें',
        'dashboard.availableTests': 'उपलब्ध परीक्षाएं',
        'dashboard.howToAnswer': 'कैसे उत्तर दें',
        'dashboard.noTests': 'कोई सक्रिय परीक्षा उपलब्ध नहीं',
        'dashboard.noTestsDesc': 'अभी तक कोई सक्रिय परीक्षा प्रकाशित नहीं की गई है',
        
        'question.selectAnswer': 'उत्तर चुनें',
        'question.submitResponse': 'उत्तर जमा करें',
        'question.answerAll': 'प्रत्येक प्रश्नावली के नीचे सबमिट बटन सक्षम करने के लिए सभी प्रश्नों का उत्तर दें।',
      }
    },
    mr: {
      code: 'mr',
      name: 'Marathi',
      nativeName: 'मराठी',
      translations: {
        'nav.dashboard': 'डॅशबोर्ड',
        'nav.responses': 'उत्तरे',
        'nav.leaderboard': 'लीडरबोर्ड',
        'nav.logout': 'लॉग आउट',
        'nav.settings': 'सेटिंग्ज',
        
        'settings.title': 'सेटिंग्ज',
        'settings.language': 'भाषा',
        'settings.apiKey': 'API की सेटअप',
        'settings.close': 'बंद करा',
        'settings.save': 'सेव्ह करा',
        
        'apiKey.setup': 'API की सेटअप करा',
        'apiKey.update': 'API की अपडेट करा',
        'apiKey.clear': 'की क्लियर करा',
        'apiKey.success': 'OpenAI API की यशस्वीरित्या सेव्ह झाली आहे',
        'apiKey.cleared': 'OpenAI API की काढून टाकली आहे',
        
        'common.generate': 'सामग्री तयार करा',
        'common.generating': 'तयार करत आहे...',
        'common.submit': 'सबमिट करा',
        'common.cancel': 'रद्द करा',
        'common.save': 'सेव्ह करा',
        'common.delete': 'डिलीट करा',
        'common.edit': 'एडिट करा',
        
        'dashboard.welcome': 'स्वागत आहे',
        'dashboard.admin': 'अॅडमिन',
        'dashboard.guest': 'पाहुणे',
        'dashboard.generateContent': 'सामग्री तयार करा',
        'dashboard.describeContent': 'तुमच्या सामग्रीचे वर्णन करा',
        'dashboard.availableTests': 'उपलब्ध चाचण्या',
        'dashboard.howToAnswer': 'उत्तर कसे द्यावे',
        'dashboard.noTests': 'कोणत्याही सक्रिय चाचण्या उपलब्ध नाहीत',
        'dashboard.noTestsDesc': 'अद्याप कोणत्याही सक्रिय चाचण्या प्रकाशित केल्या गेल्या नाहीत',
        
        'question.selectAnswer': 'उत्तरे निवडा',
        'question.submitResponse': 'उत्तरे सबमिट करा',
        'question.answerAll': 'प्रत्येक प्रश्नावलीच्या तळाशी सबमिट बटन सक्षम करण्यासाठी सर्व प्रश्नांची उत्तरे द्या.',
      }
    },
    kn: {
      code: 'kn',
      name: 'Kannada',
      nativeName: 'ಕನ್ನಡ',
      translations: {
        'nav.dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
        'nav.responses': 'ಪ್ರತಿಕ್ರಿಯೆಗಳು',
        'nav.leaderboard': 'ಲೀಡರ್‌ಬೋರ್ಡ್',
        'nav.logout': 'ಲಾಗ್ ಔಟ್',
        'nav.settings': 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
        
        'settings.title': 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
        'settings.language': 'ಭಾಷೆ',
        'settings.apiKey': 'API ಕೀ ಸೆಟಪ್',
        'settings.close': 'ಮುಚ್ಚಿ',
        'settings.save': 'ಉಳಿಸಿ',
        
        'apiKey.setup': 'API ಕೀ ಸೆಟಪ್ ಮಾಡಿ',
        'apiKey.update': 'API ಕೀ ಅಪ್‌ಡೇಟ್ ಮಾಡಿ',
        'apiKey.clear': 'ಕೀ ಕ್ಲಿಯರ್ ಮಾಡಿ',
        'apiKey.success': 'OpenAI API ಕೀ ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ',
        'apiKey.cleared': 'OpenAI API ಕೀ ತೆಗೆದುಹಾಕಲಾಗಿದೆ',
        
        'common.generate': 'ವಿಷಯ ಉತ್ಪಾದಿಸಿ',
        'common.generating': 'ಉತ್ಪಾದಿಸುತ್ತಿದೆ...',
        'common.submit': 'ಸಲ್ಲಿಸಿ',
        'common.cancel': 'ರದ್ದುಮಾಡಿ',
        'common.save': 'ಉಳಿಸಿ',
        'common.delete': 'ಅಳಿಸಿ',
        'common.edit': 'ಸಂಪಾದಿಸಿ',
        
        'dashboard.welcome': 'ಸ್ವಾಗತ',
        'dashboard.admin': 'ನಿರ್ವಾಹಕ',
        'dashboard.guest': 'ಅತಿಥಿ',
        'dashboard.generateContent': 'ವಿಷಯ ಉತ್ಪಾದಿಸಿ',
        'dashboard.describeContent': 'ನಿಮ್ಮ ವಿಷಯವನ್ನು ವಿವರಿಸಿ',
        'dashboard.availableTests': 'ಲಭ್ಯವಿರುವ ಪರೀಕ್ಷೆಗಳು',
        'dashboard.howToAnswer': 'ಹೇಗೆ ಉತ್ತರಿಸುವುದು',
        'dashboard.noTests': 'ಯಾವುದೇ ಸಕ್ರಿಯ ಪರೀಕ್ಷೆಗಳು ಲಭ್ಯವಿಲ್ಲ',
        'dashboard.noTestsDesc': 'ಇನ್ನೂ ಯಾವುದೇ ಸಕ್ರಿಯ ಪರೀಕ್ಷೆಗಳನ್ನು ಪ್ರಕಟಿಸಲಾಗಿಲ್ಲ',
        
        'question.selectAnswer': 'ಉತ್ತರಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
        'question.submitResponse': 'ಉತ್ತರಗಳನ್ನು ಸಲ್ಲಿಸಿ',
        'question.answerAll': 'ಪ್ರತಿ ಪ್ರಶ್ನಾವಳಿಯ ಕೆಳಭಾಗದಲ್ಲಿ ಸಲ್ಲಿಸುವ ಬಟನ್ ಅನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಲು ಎಲ್ಲಾ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ.',
      }
    },
    gu: {
      code: 'gu',
      name: 'Gujarati',
      nativeName: 'ગુજરાતી',
      translations: {
        'nav.dashboard': 'ડેશબોર્ડ',
        'nav.responses': 'જવાબો',
        'nav.leaderboard': 'લીડરબોર્ડ',
        'nav.logout': 'લોગ આઉટ',
        'nav.settings': 'સેટિંગ્સ',
        
        'settings.title': 'સેટિંગ્સ',
        'settings.language': 'ભાષા',
        'settings.apiKey': 'API કી સેટઅપ',
        'settings.close': 'બંધ કરો',
        'settings.save': 'સેવ કરો',
        
        'apiKey.setup': 'API કી સેટઅપ કરો',
        'apiKey.update': 'API કી અપડેટ કરો',
        'apiKey.clear': 'કી ક્લિયર કરો',
        'apiKey.success': 'OpenAI API કી સફળતાપૂર્વક સેવ થઈ ગઈ છે',
        'apiKey.cleared': 'OpenAI API કી દૂર કરવામાં આવી છે',
        
        'common.generate': 'સામગ્રી જનરેટ કરો',
        'common.generating': 'જનરેટ કરી રહ્યા છીએ...',
        'common.submit': 'સબમિટ કરો',
        'common.cancel': 'રદ કરો',
        'common.save': 'સેવ કરો',
        'common.delete': 'ડિલીટ કરો',
        'common.edit': 'એડિટ કરો',
        
        'dashboard.welcome': 'સ્વાગત છે',
        'dashboard.admin': 'એડમિન',
        'dashboard.guest': 'મહેમાન',
        'dashboard.generateContent': 'સામગ્રી જનરેટ કરો',
        'dashboard.describeContent': 'તમારી સામગ્રીનું વર્ણન કરો',
        'dashboard.availableTests': 'ઉપલબ્ધ ટેસ્ટ',
        'dashboard.howToAnswer': 'કેવી રીતે જવાબ આપવો',
        'dashboard.noTests': 'કોઈ સક્રિય ટેસ્ટ ઉપલब્ધ નથી',
        'dashboard.noTestsDesc': 'હજી સુધી કોઈ સક્રિય ટેસ્ટ પ્રકાશિત કરવામાં આવ્યા નથી',
        
        'question.selectAnswer': 'જવાબો પસંદ કરો',
        'question.submitResponse': 'જવાબો સબમિટ કરો',
        'question.answerAll': 'દરેક પ્રશ્નાવલીના તળિયે સબમિટ બટન સક્રિય કરવા માટે બધા પ્રશ્નોના જવાબ આપો.',
      }
    },
    bn: {
      code: 'bn',
      name: 'Bengali',
      nativeName: 'বাংলা',
      translations: {
        'nav.dashboard': 'ড্যাশবোর্ড',
        'nav.responses': 'জবাব',
        'nav.leaderboard': 'লিডারবোর্ড',
        'nav.logout': 'লগ আউট',
        'nav.settings': 'সেটিংস',
        
        'settings.title': 'সেটিংস',
        'settings.language': 'ভাষা',
        'settings.apiKey': 'API কী সেটআপ',
        'settings.close': 'বন্ধ করুন',
        'settings.save': 'সেভ করুন',
        
        'apiKey.setup': 'API কী সেটআপ করুন',
        'apiKey.update': 'API কী আপডেট করুন',
        'apiKey.clear': 'কী ক্লিয়ার করুন',
        'apiKey.success': 'OpenAI API কী সফলভাবে সেভ হয়েছে',
        'apiKey.cleared': 'OpenAI API কী মুছে ফেলা হয়েছে',
        
        'common.generate': 'কন্টেন্ট তৈরি করুন',
        'common.generating': 'তৈরি করা হচ্ছে...',
        'common.submit': 'জমা দিন',
        'common.cancel': 'বাতিল করুন',
        'common.save': 'সেভ করুন',
        'common.delete': 'ডিলিট করুন',
        'common.edit': 'সম্পাদনা করুন',
        
        'dashboard.welcome': 'স্বাগতম',
        'dashboard.admin': 'অ্যাডমিন',
        'dashboard.guest': 'অতিথি',
        'dashboard.generateContent': 'কন্টেন্ট তৈরি করুন',
        'dashboard.describeContent': 'আপনার কন্টেন্ট বর্ণনা করুন',
        'dashboard.availableTests': 'উপলব্ধ পরীক্ষা',
        'dashboard.howToAnswer': 'কীভাবে উত্তর দিবেন',
        'dashboard.noTests': 'কোনো সক্রিয় পরীক্ষা উপলব্ধ নেই',
        'dashboard.noTestsDesc': 'এখনও কোনো সক্রিয় পরীক্ষা প্রকাশিত হয়নি',
        
        'question.selectAnswer': 'উত্তর নির্বাচন করুন',
        'question.submitResponse': 'উত্তর জমা দিন',
        'question.answerAll': 'প্রতিটি প্রশ্নপত্রের নিচে জমা দেওয়ার বোতাম সক্রিয় করতে সমস্ত প্রশ্নের উত্তর দিন।',
      }
    }
  };
  private languageChangeListeners: Array<(newLanguage: string) => void> = [];
  
  // Add translation cache and request deduplication
  private translationCache = new Map<string, string>();
  private pendingTranslations = new Map<string, Promise<string>>();
  
  constructor() {
    // Load saved language from localStorage
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage && this.languages[savedLanguage]) {
      this.currentLanguage = savedLanguage;
    }
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  setLanguage(languageCode: string): void {
    if (this.languages[languageCode] && this.currentLanguage !== languageCode) {
      const oldLanguage = this.currentLanguage;
      this.currentLanguage = languageCode;
      localStorage.setItem('selectedLanguage', languageCode);
      
      console.log(`Language changed from ${oldLanguage} to ${languageCode}`);
      
      // Notify all listeners about the language change
      this.languageChangeListeners.forEach(listener => {
        try {
          listener(languageCode);
        } catch (error) {
          console.error('Error in language change listener:', error);
        }
      });
      
      // Dispatch a custom event for language change
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { 
          oldLanguage, 
          newLanguage: languageCode 
        } 
      }));
    }
  }

  onLanguageChange(callback: (newLanguage: string) => void): () => void {
    this.languageChangeListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.languageChangeListeners.indexOf(callback);
      if (index > -1) {
        this.languageChangeListeners.splice(index, 1);
      }
    };
  }

  getAvailableLanguages(): Array<{ code: string; name: string; nativeName: string }> {
    return Object.values(this.languages).map(lang => ({
      code: lang.code,
      name: lang.name,
      nativeName: lang.nativeName
    }));
  }

  translate(key: string): string {
    const currentLang = this.languages[this.currentLanguage];
    return currentLang?.translations[key] || key;
  }

  async translateContent(content: string, targetLanguage: string): Promise<string> {
    if (targetLanguage === 'en' || !content || !content.trim()) {
      return content;
    }

    // Create cache key for deduplication
    const cacheKey = `${content}-${targetLanguage}`;
    
    // Check cache first
    if (this.translationCache.has(cacheKey)) {
      console.log('🎯 Using cached translation');
      return this.translationCache.get(cacheKey)!;
    }
    
    // Check if translation is already in progress
    if (this.pendingTranslations.has(cacheKey)) {
      console.log('⏳ Translation already in progress, waiting...');
      return this.pendingTranslations.get(cacheKey)!;
    }

    // Start new translation
    const translationPromise = this.performTranslation(content, targetLanguage, cacheKey);
    this.pendingTranslations.set(cacheKey, translationPromise);
    
    try {
      const result = await translationPromise;
      return result;
    } finally {
      // Clean up pending translation
      this.pendingTranslations.delete(cacheKey);
    }
  }

  private async performTranslation(content: string, targetLanguage: string, cacheKey: string): Promise<string> {
    try {
      // Get the API key from ChatGPTService
      const { ChatGPTService } = await import('./ChatGPTService');
      const apiKey = ChatGPTService.getApiKey();
      
      if (!apiKey) {
        console.warn('No OpenAI API key available for translation, returning original content');
        return content;
      }

      const languageNames = {
        'hi': 'Hindi',
        'mr': 'Marathi', 
        'kn': 'Kannada',
        'gu': 'Gujarati',
        'bn': 'Bengali'
      };

      const targetLanguageName = languageNames[targetLanguage as keyof typeof languageNames] || targetLanguage;

      console.log(`🌐 Translating content to ${targetLanguageName}...`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the provided text accurately to ${targetLanguageName}. Maintain the original meaning, tone, and context. If the text contains questions, options, or structured content, preserve the structure and formatting. Return only the translated text without any additional comments or explanations.`
            },
            {
              role: 'user',
              content: content
            }
          ],
          temperature: 0.2,
          max_tokens: Math.min(4000, content.length * 2),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Translation API error:', error);
        throw new Error(`Translation failed: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const translatedText = data.choices[0]?.message?.content?.trim();
      
      if (!translatedText) {
        throw new Error('No translated content received');
      }

      // Cache the successful translation
      this.translationCache.set(cacheKey, translatedText);
      
      console.log(`✅ Translation to ${targetLanguageName} completed successfully`);
      return translatedText;
    } catch (error) {
      console.error('Error translating content:', error);
      // Return original content if translation fails
      return content;
    }
  }

  async translateQuestion(question: any, targetLanguage: string): Promise<any> {
    if (targetLanguage === 'en') {
      return question;
    }

    try {
      const translatedQuestion = { ...question };
      
      // Translate question text
      if (question.text) {
        translatedQuestion.text = await this.translateContent(question.text, targetLanguage);
      }
      
      // Translate options if they exist
      if (question.options && Array.isArray(question.options)) {
        const translatedOptions = await Promise.all(
          question.options.map((option: string) => 
            this.translateContent(option, targetLanguage)
          )
        );
        translatedQuestion.options = translatedOptions;
      }
      
      // Translate explanation if it exists
      if (question.explanation) {
        translatedQuestion.explanation = await this.translateContent(question.explanation, targetLanguage);
      }

      return translatedQuestion;
    } catch (error) {
      console.error('Error translating question:', error);
      return question; // Return original if translation fails
    }
  }

  async translateQuestions(questions: any[], targetLanguage: string): Promise<any[]> {
    if (targetLanguage === 'en' || !questions || questions.length === 0) {
      return questions;
    }

    console.log(`🔤 Translating ${questions.length} questions to ${targetLanguage}...`);
    
    try {
      const translatedQuestions = await Promise.all(
        questions.map(question => this.translateQuestion(question, targetLanguage))
      );
      
      console.log(`✅ Successfully translated ${translatedQuestions.length} questions`);
      return translatedQuestions;
    } catch (error) {
      console.error('Error translating questions array:', error);
      return questions; // Return original if translation fails
    }
  }
}

export const LanguageService = new LanguageServiceClass();
