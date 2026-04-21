export const translations = {
  ru: {
    app: {
      name: 'D-Chat',
      tagline: 'Защищённый мессенджер',
      description: 'D-Chat — современный, безопасный и простой в использовании мессенджер для любых целей.',
      welcome: 'Добро пожаловать',
      username: 'Имя пользователя или Email',
      password: 'Пароль',
      login: 'Войти',
      register: 'Зарегистрироваться',
      noAccount: 'Нет аккаунта?',
      haveAccount: 'Уже есть аккаунт?',
      displayName: 'Отображаемое имя',
    },
    features: {
      encryption: {
        title: 'Сквозное шифрование',
        desc: 'Ваши сообщения видны только вам и собеседнику'
      },
      groups: {
        title: 'Групповые чаты',
        desc: 'Создавайте комнаты с паролем'
      },
      files: {
        title: 'Обмен файлами',
        desc: 'Отправляйте изображения'
      },
      everywhere: {
        title: 'Доступен везде',
        desc: 'Входите с любого устройства'
      }
    },
    settings: {
      title: 'Настройки',
      theme: 'Тема',
      language: 'Язык',
      dark: 'Тёмная',
      light: 'Светлая',
      auto: 'Авто',
    },
    chat: {
      search: 'Поиск',
      typeMessage: 'Написать сообщение...',
      online: 'в сети',
      typing: 'печатает...',
    }
  },
  en: {
    app: {
      name: 'D-Chat',
      tagline: 'Secure Messenger',
      description: 'D-Chat is a modern, secure and easy-to-use messenger for any purpose.',
      welcome: 'Welcome',
      username: 'Username or Email',
      password: 'Password',
      login: 'Log In',
      register: 'Sign Up',
      noAccount: 'No account?',
      haveAccount: 'Already have an account?',
      displayName: 'Display Name',
    },
    features: {
      encryption: {
        title: 'End-to-End Encryption',
        desc: 'Your messages are only visible to you and your recipient'
      },
      groups: {
        title: 'Group Chats',
        desc: 'Create password-protected rooms'
      },
      files: {
        title: 'File Sharing',
        desc: 'Send images and documents'
      },
      everywhere: {
        title: 'Available Everywhere',
        desc: 'Access from any device'
      }
    },
    settings: {
      title: 'Settings',
      theme: 'Theme',
      language: 'Language',
      dark: 'Dark',
      light: 'Light',
      auto: 'Auto',
    },
    chat: {
      search: 'Search',
      typeMessage: 'Write a message...',
      online: 'online',
      typing: 'typing...',
    }
  }
} as const

export type TranslationKey = keyof typeof translations.en