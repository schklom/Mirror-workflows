package ch.duartesantos.opengym;

/**
 * The end-of-rest tone the native side plays while the app is in the background or the screen
 * is off, as 16-bit mono samples. Plain Java with no Android classes, so it has a unit test.
 *
 * The page plays the same two choices through Web Audio (frontend/src/lib/sound.js chime()):
 * the chime, high, low, then high and long, held near full scale in a bright timbre, and the
 * classic three beeps. Until v1.3.11 this side only knew the classic beeps, so a locked phone
 * played the quiet old sound however Settings → Sound was set.
 */
final class RestTone {
    static final int RATE = 22050;

    /**
     * Silence after the tone. The player is let go once the mixer has taken every sample, but
     * Bluetooth earbuds and the screen-off low-power output still hold up to a few hundred
     * milliseconds of audio by then; without this tail the last, longest note got cut.
     */
    static final double TAIL_SEC = 0.6;

    /** lib/sound.js CHIME_PEAK, CHIME and the 0.6 hold. */
    static final double CHIME_PEAK = 0.9;
    private static final double[][] CHIME = {{1319, 0.16, 0}, {988, 0.16, 0.22}, {1319, 0.5, 0.44}};
    private static final double CHIME_HOLD = 0.6;
    /** lib/sound.js setBright: the fundamental and three falling harmonics. */
    private static final double[] BRIGHT = {1, 0.6, 0.35, 0.2};

    private RestTone() {}

    static short[] render(boolean classic) {
        return withTail(classic ? renderBeeps() : renderChime());
    }

    /**
     * The chime as the page renders it: each note ramps up from silence in 20 ms, holds its peak
     * for 60% of the note, then falls away exponentially, in a wave normalised to a peak of 1 as
     * Web Audio normalises a periodic wave.
     */
    static short[] renderChime() {
        double end = 0;
        for (double[] n : CHIME) end = Math.max(end, n[2] + n[1]);
        double[] mix = new double[(int) Math.ceil(end * RATE)];
        double norm = brightPeak();
        for (double[] n : CHIME) {
            double freq = n[0], dur = n[1];
            int start = (int) Math.round(n[2] * RATE);
            int len = (int) (dur * RATE);
            for (int s = 0; s < len && start + s < mix.length; s++) {
                double t = s / (double) RATE;
                double wave = 0;
                for (int k = 0; k < BRIGHT.length; k++) wave += BRIGHT[k] * Math.sin(2 * Math.PI * freq * (k + 1) * t);
                mix[start + s] += wave / norm * chimeGain(t, dur);
            }
        }
        short[] out = new short[mix.length];
        for (int i = 0; i < mix.length; i++) out[i] = (short) Math.max(-32767, Math.min(32767, Math.round(mix[i] * 32767)));
        return out;
    }

    /** The gain curve of lib/sound.js tone() with peak CHIME_PEAK and hold CHIME_HOLD. */
    static double chimeGain(double t, double dur) {
        double floor = 0.001, attack = 0.02, holdEnd = dur * CHIME_HOLD;
        if (t < 0) return 0;
        if (t < attack) return floor * Math.pow(CHIME_PEAK / floor, t / attack);
        if (t < holdEnd) return CHIME_PEAK;
        if (t < dur) return CHIME_PEAK * Math.pow(floor / CHIME_PEAK, (t - holdEnd) / (dur - holdEnd));
        return 0;
    }

    private static double brightPeak() {
        double max = 0;
        for (int i = 0; i < 4096; i++) {
            double x = 2 * Math.PI * i / 4096;
            double v = 0;
            for (int k = 0; k < BRIGHT.length; k++) v += BRIGHT[k] * Math.sin((k + 1) * x);
            max = Math.max(max, Math.abs(v));
        }
        return max;
    }

    /**
     * The classic beeps (880, 880, 1320). Flat at 0.85 of full scale rather than the page's fade
     * from 0.35: this is what the locked phone has always played for "Classic".
     */
    static short[] renderBeeps() {
        int[] freq = {880, 880, 1320};
        double[] dur = {0.15, 0.15, 0.40};
        double[] gap = {0.10, 0.10, 0};
        int total = 0;
        for (int i = 0; i < freq.length; i++) total += (int) (RATE * (dur[i] + gap[i]));
        short[] out = new short[total];
        int pos = 0;
        for (int i = 0; i < freq.length; i++) {
            int n = (int) (RATE * dur[i]);
            int g = (int) (RATE * gap[i]);
            int fade = Math.max(1, RATE / 200);
            for (int s = 0; s < n; s++) {
                double env = 1;
                if (s < fade) env = s / (double) fade;
                else if (s > n - fade) env = (n - s) / (double) fade;
                double wave = Math.sin(2 * Math.PI * freq[i] * s / RATE);
                out[pos++] = (short) Math.max(-32767, Math.min(32767, wave * env * 0.85 * 32767));
            }
            pos += g;
        }
        return out;
    }

    static short[] withTail(short[] tone) {
        short[] out = new short[tone.length + (int) (TAIL_SEC * RATE)];
        System.arraycopy(tone, 0, out, 0, tone.length);
        return out;
    }
}
