
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
        'apiKey.clear': 'की क्लिअर करा',
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
        'question.answerAll': 'प्रत्येक प्रश्नावलीच्या तळाशी सबमिट बटण सक्षम करण्यासाठी सर्व प्रश्नांची उत्तरे द्या.',
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
        'dashboard.noTests': 'કોઈ સક્રિય ટેસ્ટ ઉપલબ્ધ નથી',
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
    if (this.languages[languageCode]) {
      this.currentLanguage = languageCode;
      localStorage.setItem('selectedLanguage', languageCode);
    }
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

  // Method to translate question content
  async translateContent(content: string, targetLanguage: string): Promise<string> {
    if (targetLanguage === 'en' || !content) {
      return content;
    }

    // For demo purposes, we'll return the original content
    // In a real implementation, you would integrate with a translation API
    return content;
  }
}

export const LanguageService = new LanguageServiceClass();
