(function (root) {
  'use strict';

  // Every venue, address and opening time below is fictional demo content.
  // The demo repeats these opening hours every day, including Saturday.
  const venues = [
    {
      id: 'stasi', name: 'Στάση', area: 'Παγκράτι', category: 'All-day café & φαγητό',
      description: 'Ένα ήσυχο τραπέζι στην αυλή, εποχικά πιάτα και jazz στο βάθος. Για μεσημέρια που γίνονται χαλαρά βράδια.',
      price: 22, tags: ['food', 'coffee', 'outdoor', 'quiet'], music: ['jazz'],
      hours: { open: '08:00', close: '01:00' }, kitchen: { open: '12:00', close: '23:30' },
      image: 'assets/cafe.jpg', address: 'Σε μια φανταστική αυλή στο Παγκράτι', walkMinutes: 7, featured: true
    },
    {
      id: 'misofeggaro', name: 'Μισό Φεγγάρι', area: 'Παγκράτι', category: 'Φαγητό & cocktail bar',
      description: 'Πιάτα για τη μέση, cocktails και μια παρέα που δεν κοιτάζει το ρολόι. Η κουζίνα μένει ανοιχτή και μετά τα μεσάνυχτα.',
      price: 28, tags: ['food', 'bar', 'outdoor', 'lively'], music: ['pop', 'electronic'],
      hours: { open: '12:00', close: '03:00' }, kitchen: { open: '12:00', close: '00:30' },
      image: 'assets/food.jpg', address: 'Σε έναν φανταστικό πεζόδρομο στο Παγκράτι', walkMinutes: 11, featured: true
    },
    {
      id: 'chartino', name: 'Χάρτινο', area: 'Παγκράτι', category: 'Brunch & καφές',
      description: 'Μεγάλα παράθυρα, προσεγμένος καφές και brunch για ένα αργό μεσημέρι. Μετά τις 17:00 σερβίρονται μόνο ροφήματα.',
      price: 14, tags: ['food', 'coffee', 'quiet'], music: ['jazz'],
      hours: { open: '08:00', close: '21:00' }, kitchen: { open: '09:00', close: '17:00' },
      image: 'assets/cafe.jpg', address: 'Σε έναν φανταστικό μικρό δρόμο στο Παγκράτι', walkMinutes: 5, featured: false
    },
    {
      id: 'nima', name: 'Νήμα', area: 'Παγκράτι', category: 'Bar & ζωντανή μουσική',
      description: 'Μικρή μουσική σκηνή, φωτισμός χαμηλά και ποτό κοντά στην μπάντα. Δεν διαθέτει κουζίνα.',
      price: 18, tags: ['bar', 'live', 'lively'], music: ['jazz', 'greek'],
      hours: { open: '18:00', close: '03:00' }, kitchen: null, liveHours: { open: '21:00', close: '00:30' },
      image: 'assets/bar.jpg', address: 'Σε μια φανταστική στοά στο Παγκράτι', walkMinutes: 9, featured: false
    },
    {
      id: 'mikriavli', name: 'Μικρή Αυλή', area: 'Κουκάκι', category: 'Μεσογειακή κουζίνα & καφές',
      description: 'Πράσινη αυλή, μεσογειακά πιάτα και ήρεμη μουσική. Ταιριάζει σε κουβέντα και φαγητό χωρίς βιασύνη.',
      price: 20, tags: ['food', 'coffee', 'outdoor', 'quiet'], music: ['jazz', 'greek'],
      hours: { open: '09:00', close: '00:00' }, kitchen: { open: '10:00', close: '22:30' },
      image: 'assets/terrace.jpg', address: 'Σε μια φανταστική αυλή στο Κουκάκι', walkMinutes: 8, featured: true
    },
    {
      id: 'rythmos', name: 'Ρυθμός', area: 'Κουκάκι', category: 'Μεζέδες & ζωντανή μουσική',
      description: 'Μεζέδες για όλη την παρέα και μουσική που δυναμώνει το βράδυ. Η έξοδος ξεκινά από το μεσημεριανό τραπέζι.',
      price: 30, tags: ['food', 'bar', 'live', 'lively'], music: ['greek', 'pop'],
      hours: { open: '13:00', close: '03:00' }, kitchen: { open: '13:00', close: '00:00' }, liveHours: { open: '20:30', close: '23:30' },
      image: 'assets/food.jpg', address: 'Σε μια φανταστική πλατεία στο Κουκάκι', walkMinutes: 12, featured: false
    },
    {
      id: 'kokkos', name: 'Κόκκος & Φως', area: 'Κουκάκι', category: 'Specialty coffee',
      description: 'Καφές, φως και ήσυχα τραπέζια έξω. Μια μικρή στάση για διάβασμα ή κουβέντα· δεν σερβίρει γεύματα.',
      price: 9, tags: ['coffee', 'outdoor', 'quiet'], music: ['jazz'],
      hours: { open: '07:30', close: '20:00' }, kitchen: null,
      image: 'assets/cafe.jpg', address: 'Σε έναν φανταστικό πεζόδρομο στο Κουκάκι', walkMinutes: 4, featured: false
    },
    {
      id: 'panokipos', name: 'Πάνω Κήπος', area: 'Κουκάκι', category: 'Terrace bar & φαγητό',
      description: 'Μια ανοιχτή ταράτσα για το πρώτο ποτό της ημέρας και μικρά πιάτα μέχρι τις 23:00.',
      price: 27, tags: ['food', 'bar', 'outdoor', 'lively'], music: ['electronic', 'pop'],
      hours: { open: '17:00', close: '02:00' }, kitchen: { open: '17:00', close: '23:00' },
      image: 'assets/terrace.jpg', address: 'Σε μια φανταστική ταράτσα στο Κουκάκι', walkMinutes: 10, featured: true
    },
    {
      id: 'triapiata', name: 'Τρία Πιάτα', area: 'Ψυρρή', category: 'Μεζεδοπωλείο & bar',
      description: 'Μεζέδες, μεγάλη παρέα και ελληνικές μουσικές. Ανοιχτό από το μεσημέρι για μια έξοδο που μπορεί να κρατήσει.',
      price: 24, tags: ['food', 'bar', 'lively'], music: ['greek'],
      hours: { open: '12:00', close: '02:00' }, kitchen: { open: '12:00', close: '23:30' },
      image: 'assets/food.jpg', address: 'Σε έναν φανταστικό πεζόδρομο στου Ψυρρή', walkMinutes: 6, featured: true
    },
    {
      id: 'defterosgyros', name: 'Δεύτερος Γύρος', area: 'Ψυρρή', category: 'Cocktail & music bar',
      description: 'Cocktails, ηλεκτρονική μουσική και βραδινή ενέργεια μέχρι αργά. Για ποτό μετά το φαγητό, καθώς δεν διαθέτει κουζίνα.',
      price: 19, tags: ['bar', 'live', 'lively'], music: ['electronic', 'pop'],
      hours: { open: '19:00', close: '04:00' }, kitchen: null, liveHours: { open: '22:00', close: '02:00' },
      image: 'assets/bar.jpg', address: 'Σε μια φανταστική στοά στου Ψυρρή', walkMinutes: 8, featured: false
    },
    {
      id: 'proiniselida', name: 'Πρωινή Σελίδα', area: 'Ψυρρή', category: 'Πρωινό, brunch & καφές',
      description: 'Τοστ, brunch και καφές σε μια ήσυχη γωνιά. Η κουζίνα ολοκληρώνει το τελευταίο της service στις 16:00.',
      price: 15, tags: ['food', 'coffee', 'quiet'], music: ['jazz'],
      hours: { open: '08:00', close: '19:00' }, kitchen: { open: '09:00', close: '16:00' },
      image: 'assets/cafe.jpg', address: 'Σε μια φανταστική γωνιά στου Ψυρρή', walkMinutes: 5, featured: false
    },
    {
      id: 'kryfistoa', name: 'Κρυφή Στοά', area: 'Ψυρρή', category: 'All-day αυλή & bar',
      description: 'Μια προστατευμένη αυλή για καφέ, φαγητό ή χαλαρό ποτό. Η κουζίνα παραμένει ανοιχτή μέχρι τη 01:00.',
      price: 26, tags: ['food', 'coffee', 'bar', 'outdoor', 'quiet'], music: ['jazz', 'pop'],
      hours: { open: '10:00', close: '02:00' }, kitchen: { open: '12:00', close: '01:00' },
      image: 'assets/terrace.jpg', address: 'Σε μια φανταστική αυλή στου Ψυρρή', walkMinutes: 13, featured: true
    }
  ];

  const data = {
    venues,
    areas: ['Παγκράτι', 'Κουκάκι', 'Ψυρρή'],
    tagLabels: { food: 'Φαγητό', coffee: 'Καφές', bar: 'Bar', outdoor: 'Εξωτερικός χώρος', quiet: 'Ήρεμη ατμόσφαιρα', lively: 'Ζωντανή ατμόσφαιρα', live: 'Ζωντανή μουσική' },
    musicLabels: { jazz: 'Jazz', greek: 'Ελληνική', electronic: 'Electronic', pop: 'Pop' },
    defaultPreferences: { day: 'today', time: '14:00', area: 'Παγκράτι', budget: 30, required: ['food'], wanted: ['outdoor'], music: 'any' },
    demoNote: 'Demo με φανταστικά μαγαζιά, ενδεικτικές τιμές και ωράρια που είναι ίδια κάθε ημέρα. Οι συστάσεις προσομοιώνονται τοπικά.'
  };

  root.GoOutData = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof globalThis !== 'undefined' ? globalThis : window);
