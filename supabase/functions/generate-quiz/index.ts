import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { difficulty = 'easy', count = 5, language = 'ru' } = await req.json();

    const { data: audioRecords, error: audioError } = await supabase
      .from('audio_records')
      .select('*')
      .order('name');

    if (audioError) throw audioError;

    if (!audioRecords || audioRecords.length === 0) {
      throw new Error('No audio records found');
    }

    const questions = [];

    for (let i = 0; i < count && i < audioRecords.length; i++) {
      const correctSound = audioRecords[i];
      const otherSounds = audioRecords.filter(s => s.id !== correctSound.id);
      const wrongOptions = otherSounds
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      let question;
      let options;

      if (difficulty === 'easy') {
        question = language === 'ru'
          ? `Какой шум вы слышите?`
          : `Which heart sound do you hear?`;

        options = [
          { id: 'a', text: correctSound.name, isCorrect: true },
          ...wrongOptions.map((s, idx) => ({
            id: String.fromCharCode(98 + idx),
            text: s.name,
            isCorrect: false,
          })),
        ].sort(() => Math.random() - 0.5);

      } else if (difficulty === 'medium') {
        const theoryPrompts = [
          language === 'ru' ? 'Какая патология вызывает этот шум?' : 'What pathology causes this sound?',
          language === 'ru' ? 'Каков механизм возникновения этого шума?' : 'What is the mechanism of this sound?',
          language === 'ru' ? 'В какую фазу сердечного цикла выслушивается этот шум?' : 'In which phase of the cardiac cycle is this sound heard?',
        ];
        question = theoryPrompts[i % theoryPrompts.length];

        const { data: theory } = await supabase
          .from('theory_content')
          .select('content')
          .limit(1)
          .single();

        const explanation = theory?.content || (language === 'ru' ? 'Изучите теоретический материал' : 'Study the theoretical material');

        options = [
          { id: 'a', text: correctSound.name, isCorrect: true },
          ...wrongOptions.map((s, idx) => ({
            id: String.fromCharCode(98 + idx),
            text: s.name,
            isCorrect: false,
          })),
        ].sort(() => Math.random() - 0.5);

      } else {
        question = language === 'ru'
          ? `Пациент 45 лет жалуется на одышку и утомляемость. При аускультации выслушивается данный шум. Какой наиболее вероятный диагноз?`
          : `A 45-year-old patient complains of dyspnea and fatigue. This sound is heard on auscultation. What is the most likely diagnosis?`;

        options = [
          { id: 'a', text: correctSound.name, isCorrect: true },
          ...wrongOptions.map((s, idx) => ({
            id: String.fromCharCode(98 + idx),
            text: s.name,
            isCorrect: false,
          })),
        ].sort(() => Math.random() - 0.5);
      }

      questions.push({
        id: i + 1,
        question,
        audio_url: correctSound.file_url,
        auscultation_point: correctSound.auscultation_point || 'mitral',
        explanation: correctSound.description || (language === 'ru' ? 'Ознакомьтесь с теорией' : 'Review the theory'),
        difficulty,
        options,
      });
    }

    return new Response(JSON.stringify({ questions }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate quiz',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});