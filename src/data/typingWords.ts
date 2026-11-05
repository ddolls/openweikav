// Coherent Sentence Database & Word Engine for Typing Test

export interface QuoteItem {
  text: string;
  source: string;
  length: 'short' | 'medium' | 'long';
  language: 'indonesian' | 'english';
}

export const SENTENCES_INDONESIAN: string[] = [
  "Secangkir kopi hangat di pagi hari selalu memberikan ketenangan sebelum memulai hari yang sibuk.",
  "Mendengarkan rintik hujan di sore hari menciptakan suasana damai yang sangat menenangkan pikiran.",
  "Membaca buku favorit di akhir pekan adalah cara terbaik untuk beristirahat setelah bekerja keras.",
  "Aroma tanah basah setelah hujan lebat selalu membawa ingatan manis tentang masa kecil kita.",
  "Berjalan santai di taman kota saat senja memberikan udara segar dan menyegarkan kembali pikiran.",
  "Keyboard mekanik dengan switch berkualitas memberikan sensasi ketukan yang memuaskan dan presisi tinggi.",
  "Setiap tombol yang ditekan menghasilkan pantulan pegas yang halus tanpa rasa lelah pada jari jemari.",
  "Pengaturan tata letak tombol yang ergonomis membantu kita mengetik lebih cepat dan akurat sepanjang hari.",
  "Perkembangan teknologi modern telah mengubah cara manusia berkomunikasi dan bertukar gagasan secara global.",
  "Menulis baris kode program membutuhkan ketelitian tinggi dan kemampuan memecahkan masalah yang rumit.",
  "Perjalanan ribuan kilometer selalu dimulai dengan satu langkah pertama yang penuh keyakinan dan keberanian.",
  "Konsistensi kecil yang dilakukan setiap hari akan menghasilkan perubahan besar dan bermakna di masa depan.",
  "Jangan pernah takut membuat kesalahan karena dari sanalah kita mendapatkan pengalaman paling berharga.",
  "Keberhasilan sejati bukanlah tentang mengalahkan orang lain melainkan melampaui batas diri kita sendiri.",
  "Fokuslah pada hal yang bisa kamu kendalikan dan lepaskan kekhawatiran tentang hal di luar kuasamu.",
  "Matahari perlahan terbit di balik bukit menyinari kabut tipis yang menyelimuti lembah hijau yang asri.",
  "Bintang di langit malam memancarkan cahaya lembut yang menembus keheningan alam semesta yang luas.",
  "Aliran sungai yang jernih membelah hutan lebat membawa kesegaran bagi seluruh kehidupan di sekitarnya.",
  "Angin sejuk berhembus perlahan melalui dedaunan pohon cemara yang berdiri tegak di lereng gunung.",
  "Keanekaragaman hayati di bumi adalah anugerah tak ternilai yang harus selalu kita rawat bersama dengan bijak.",
  "Ruang kerja yang tertata rapi membantu meningkatkan konsentrasi dan kreativitas saat menyelesaikan tugas penting.",
  "Kerja sama tim yang baik dibangun di atas komunikasi jujur rasa saling percaya dan tanggung jawab penuh.",
  "Waktu adalah aset paling berharga yang tidak pernah bisa kita putar kembali begitu ia terlewati.",
  "Menyusun prioritas dengan jelas adalah kunci utama untuk menyelesaikan pekerjaan tanpa merasa kewalahan.",
  "Istirahat sejenak di sela rutinitas padat membantu menjaga stamina fisik dan kejernihan dalam berpikir.",
  "Suara deburan ombak di tepi pantai selalu menghadirkan rasa syukur yang mendalam atas indahnya kehidupan.",
  "Belajar hal baru setiap hari membuka wawasan dan memperkaya cara pandang kita terhadap dunia.",
  "Ketekunan adalah jembatan yang menghubungkan antara impian masa depan dengan kenyataan hari ini.",
  "Hidup yang sederhana sering kali menghadirkan kebahagiaan yang jauh lebih murni dan abadi.",
  "Sebuah senyuman ramah kepada orang lain dapat mencerahkan hari mereka yang sedang terasa berat.",
  "Kesehatan tubuh dan ketenangan batin adalah fondasi utama untuk mencapai kesuksesan jangka panjang.",
  "Menyelesaikan sebuah proyek dengan tuntas memberikan rasa bangga dan kepuasan batin yang mendalam.",
  "Pemandangan langit senja dengan perpaduan warna jingga dan ungu selalu berhasil memukau mata siapa pun.",
  "Kebiasaan membaca artikel bermanfaat dapat melatih otak untuk terus berpikir kritis dan analitis.",
  "Kehangatan keluarga di rumah adalah tempat terbaik untuk kembali pulang setelah seharian beraktivitas.",
  "Kunci dari komunikasi yang efektif adalah mendengarkan dengan penuh perhatian sebelum memberikan tanggapan.",
  "Menulis catatan harian membantu kita merapikan pikiran dan mengevaluasi perkembangan diri secara berkala.",
  "Rasa ingin tahu yang tinggi adalah pendorong utama bagi lahirnya berbagai penemuan hebat di dunia.",
  "Musik instrumental bertempo lambat sangat cocok diputar sebagai latar belakang saat bekerja fokus.",
  "Sinar matahari pagi mengandung vitamin yang baik untuk menyegarkan badan dan meningkatkan semangat.",
  "Setiap tantangan yang datang dalam hidup selalu membawa pelajaran berharga untuk mendewasakan diri kita.",
  "Keindahan seni terletak pada kemampuannya menyentuh emosi manusia tanpa perlu menggunakan banyak kata.",
  "Saling menghargai perbedaan pendapat adalah tanda kedewasaan dalam berinteraksi dengan sesama.",
  "Menjaga komitmen terhadap janji yang telah dibuat adalah cerminan dari integritas pribadi yang kuat.",
  "Hembusan angin malam yang sejuk menemani keheningan kota saat sebagian besar orang telah tertidur pulas.",
  "Kemajuan ilmu pengetahuan dan teknologi seharusnya dimanfaatkan sebesar-besarnya untuk kesejahteraan bersama.",
  "Latihan mengetik secara rutin selama lima belas menit setiap hari dapat melipatgandakan kecepatan jarimu.",
  "Keberanian bukanlah ketiadaan rasa takut melainkan keputusan untuk terus melangkah meski rasa takut itu ada.",
  "Kejujuran dalam bertindak akan selalu membuka pintu kepercayaan dan membangun reputasi yang baik.",
  "Menikmati proses belajar sama pentingnya dengan mencapai hasil akhir yang diinginkan."
];

export const SENTENCES_ENGLISH: string[] = [
  "A fresh cup of black coffee in the quiet morning brings a welcome moment of focus before the day begins.",
  "Listening to the gentle sound of rainfall outside creates a calm and peaceful atmosphere for thinking.",
  "Reading a thoughtful book by the window is one of the greatest pleasures after a demanding week.",
  "Walking along the quiet city streets at twilight offers a refreshing breeze and a chance to unwind.",
  "Taking a short walk outside under the sun can completely reset your mood and spark new inspiration.",
  "A well-crafted mechanical keyboard delivers an immensely satisfying bounce and a crisp acoustic profile.",
  "Smooth linear switches combined with quality keycaps make long typing sessions an absolute joy.",
  "Good software design focuses on simplicity, responsiveness, and respect for the user experience.",
  "Writing clean code is like composing music, where every function has a clear rhythm and purpose.",
  "Modern computing empowers creators around the world to build tools and share knowledge freely.",
  "A journey of a thousand miles always begins with a single deliberate step taken with conviction.",
  "Small daily habits repeated consistently compound into remarkable achievements over the years.",
  "Never fear making mistakes, because true expertise is built on the lessons learned from setbacks.",
  "Success is not about outperforming everyone else, but about being better than you were yesterday.",
  "Focus your energy on what you can influence, and let go of circumstances outside your control.",
  "The golden rays of the sunrise slowly melted the morning frost across the peaceful valley.",
  "Countless stars shimmered brightly across the dark canvas of the crisp midnight sky.",
  "A crystal clear mountain stream wound its way through the dense pines toward the distant lake.",
  "The cool ocean breeze carried the scent of salty water and the rhythmic crashing of the waves.",
  "Autumn leaves fluttered gently to the ground, blanketing the forest path in deep shades of gold.",
  "Deep work requires protecting your attention from constant interruptions and digital noise.",
  "Dedication to your craft means paying attention to subtle details that others might easily overlook.",
  "Patience and steady practice will always triumph over hurried efforts that lack foundation.",
  "The secret to lasting productivity is maintaining balance between focused effort and genuine rest.",
  "True craftsmanship is reflected in things built to endure long after the initial excitement fades.",
  "A comfortable desk setup with proper lighting reduces fatigue and encourages creative flow.",
  "Curiosity is the fuel that drives intellectual growth and keeps life perpetually fascinating.",
  "Expressing genuine gratitude for simple daily blessings can instantly transform your outlook on life.",
  "Physical exercise combined with adequate sleep lays the essential groundwork for sharp mental performance.",
  "Effective communication is far more about active listening than simply waiting for your turn to speak.",
  "The warmth of a crackling fireplace provides the perfect setting for deep reflection on cold winter nights.",
  "Every expert you admire was once a beginner who refused to quit when things felt overwhelmingly hard.",
  "Mastering touch typing on a mechanical keyboard is an investment that pays dividends for a lifetime.",
  "Great ideas often arrive when you allow your mind to wander freely away from glowing screens.",
  "Collaborative teams flourish when members feel safe to share unconventional perspectives without judgment.",
  "A well-balanced diet and plenty of hydration keep your energy steady throughout demanding workdays.",
  "The architecture of modern cities reflects the ongoing dialogue between historical tradition and future vision.",
  "Taking ownership of your decisions empowers you to steer your life in meaningful directions.",
  "A peaceful mind makes wiser decisions than one clouded by anxiety and hurried impulses.",
  "The scent of blooming jasmine in the evening air brings back delightful memories of summer vacations.",
  "Developing emotional resilience allows you to navigate life's inevitable storms with grace and poise.",
  "Regular practice of fifteen minutes a day will dramatically enhance your typing accuracy and speed.",
  "Curating a minimalist environment helps clear mental clutter and sharpens your everyday focus.",
  "The sound of waves rhythmically kissing the shoreline is nature's most soothing lullaby.",
  "Courage is not the absence of fear, but the triumph over it in the pursuit of what truly matters.",
  "Building reliable software architecture requires anticipation of change and respect for maintainability.",
  "An open heart and a curious mind will always find beauty even in the most ordinary moments.",
  "Honest feedback delivered with empathy is one of the most generous gifts a mentor can offer.",
  "Consistency in your efforts turns distant aspirations into tangible, celebrated milestones.",
  "Enjoying the journey of learning is just as rewarding as crossing the ultimate finish line."
];

// Preserved for fallback and specific vocab drills
export const WORDS_INDONESIAN: string[] = [
  "yang", "untuk", "pada", "karena", "dengan", "mereka", "sudah", "bisa", "lebih", "tidak",
  "banyak", "harus", "seperti", "setelah", "sangat", "selalu", "menjadi", "bahkan", "masih", "waktu",
  "tempat", "kembali", "membuat", "bekerja", "hidup", "dunia", "teman", "pagi", "malam", "udara",
  "pohon", "matahari", "sungai", "sistem", "tujuan", "hasil", "masalah", "solusi", "semua", "setiap",
  "cepat", "mudah", "indah", "bagus", "benar", "jelas", "bersih", "kuat", "sehat", "senang",
  "yakin", "percaya", "tenang", "mampu", "mulai", "selesai", "bicara", "dengar", "pikir", "ingat",
  "belajar", "fokus", "langkah", "pengalaman", "proses", "semangat", "harapan", "prestasi", "karya", "inovasi",
  "teknologi", "komputer", "akurasi", "ketepatan", "efisiensi", "kemudahan", "keterampilan"
];

export const WORDS_ENGLISH: string[] = [
  "the", "and", "that", "have", "with", "this", "they", "from", "will", "would",
  "there", "their", "what", "about", "which", "when", "make", "like", "time", "just",
  "know", "take", "people", "into", "year", "your", "good", "some", "could", "them",
  "other", "than", "then", "look", "only", "come", "over", "think", "also", "back",
  "after", "work", "first", "well", "even", "want", "because", "give", "most", "keyboard",
  "switch", "linear", "tactile", "speed", "system", "code", "light", "color", "world", "place",
  "point", "great", "high", "small", "large", "next", "early", "important", "same", "focus"
];

export const QUOTES_DATABASE: QuoteItem[] = [
  {
    text: "The only way to do great work is to love what you do.",
    source: "Steve Jobs",
    length: "short",
    language: "english"
  },
  {
    text: "Stay hungry, stay foolish. Never let success get to your head, and never let failure get to your heart.",
    source: "Whole Earth Catalog",
    length: "short",
    language: "english"
  },
  {
    text: "In the middle of difficulty lies opportunity. Do what you can, with what you have, where you are.",
    source: "Albert Einstein",
    length: "short",
    language: "english"
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts in the grand scheme of life.",
    source: "Winston Churchill",
    length: "medium",
    language: "english"
  },
  {
    text: "Simplicity is prerequisite for reliability. Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
    source: "Martin Fowler",
    length: "medium",
    language: "english"
  },
  {
    text: "Talk is cheap. Show me the code. Premature optimization is the root of all evil in software engineering.",
    source: "Linus Torvalds",
    length: "medium",
    language: "english"
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams. It takes courage to grow up and become who you really are through constant practice and dedication.",
    source: "Eleanor Roosevelt",
    length: "long",
    language: "english"
  },
  {
    text: "Belajarlah di saat orang lain tidur, bekerjalah di saat orang lain bermalas-malasan, dan bermimpilah di saat orang lain hanya berharap.",
    source: "William Arthur Ward",
    length: "medium",
    language: "indonesian"
  },
  {
    text: "Hidup yang baik adalah hidup yang diinspirasi oleh cinta dan dipandu oleh pengetahuan. Jangan pernah berhenti melangkah maju meraih impianmu.",
    source: "Bertrand Russell",
    length: "medium",
    language: "indonesian"
  },
  {
    text: "Perjalanan ribuan mil selalu dimulai dengan satu langkah kecil. Fokuslah pada kemajuan hari ini, bukan kesempurnaan yang instan.",
    source: "Lao Tzu",
    length: "short",
    language: "indonesian"
  },
  {
    text: "Banyak hal yang bisa menjatuhkanmu, tapi satu-satunya hal yang benar-benar dapat menjatuhkanmu adalah sikapmu sendiri yang menyerah sebelum berjuang.",
    source: "R.A. Kartini",
    length: "medium",
    language: "indonesian"
  },
  {
    text: "Kunci kebahagiaan adalah memiliki impian, kunci kesuksesan adalah meraih impian tersebut melalui kerja keras dan ketekunan tanpa henti.",
    source: "B.J. Habibie",
    length: "medium",
    language: "indonesian"
  }
];

// Helper to generate natural, coherent words from real sentences
export function getCoherentWords(
  language: 'indonesian' | 'english',
  targetCount: number,
  hasPunctuation: boolean,
  hasNumbers: boolean
): string[] {
  const sentencePool = language === 'indonesian' ? SENTENCES_INDONESIAN : SENTENCES_ENGLISH;
  // Randomly shuffle sentences so every test feels fresh
  const shuffled = [...sentencePool].sort(() => Math.random() - 0.5);
  const resultWords: string[] = [];

  let poolIdx = 0;
  while (resultWords.length < targetCount) {
    if (poolIdx >= shuffled.length) {
      // Re-shuffle if we ever exhaust the pool
      shuffled.sort(() => Math.random() - 0.5);
      poolIdx = 0;
    }

    let sentence = shuffled[poolIdx++];

    if (!hasPunctuation) {
      // Lowercase and strip punctuation marks, but keep words in coherent order
      sentence = sentence
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '');
    }

    const wordsInSentence = sentence.trim().split(/\s+/).filter(Boolean);

    for (const word of wordsInSentence) {
      if (hasNumbers && Math.random() < 0.08) {
        resultWords.push(Math.floor(Math.random() * 90 + 10).toString());
      }
      resultWords.push(word);
      if (resultWords.length >= targetCount) {
        break;
      }
    }
  }

  return resultWords;
}
