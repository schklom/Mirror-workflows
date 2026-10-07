package ch.duartesantos.opengym;

import static org.junit.Assert.*;

import org.junit.Test;

/** The tone a locked phone plays at the end of a rest (RestTone). */
public class RestToneTest {
    private static int peak(short[] s, double from, double to) {
        int max = 0;
        for (int i = (int) (from * RestTone.RATE); i < Math.min(s.length, (int) (to * RestTone.RATE)); i++) {
            max = Math.max(max, Math.abs(s[i]));
        }
        return max;
    }

    @Test
    public void chimeIsThePagesChimeNotTheClassicBeeps() {
        short[] chime = RestTone.render(false);
        short[] classic = RestTone.render(true);
        assertNotEquals(chime.length, classic.length);
        // E6 B5 E6: notes at 0, 0.22 and 0.44 s, the last one half a second long.
        assertTrue(peak(chime, 0.03, 0.09) > 0.85 * 32767);
        assertTrue(peak(chime, 0.25, 0.31) > 0.85 * 32767);
        assertTrue(peak(chime, 0.47, 0.70) > 0.85 * 32767);
        // Gaps between the notes are quiet: the notes never add up past the peak.
        assertTrue(peak(chime, 0.165, 0.215) < 300);
    }

    @Test
    public void chimeHoldsItsPeakForMostOfEachNote() {
        assertEquals(RestTone.CHIME_PEAK, RestTone.chimeGain(0.25, 0.5), 1e-9);
        assertTrue(RestTone.chimeGain(0.01, 0.5) < RestTone.CHIME_PEAK);
        assertTrue(RestTone.chimeGain(0.45, 0.5) < RestTone.CHIME_PEAK / 2);
        assertEquals(0, RestTone.chimeGain(0.6, 0.5), 0);
    }

    @Test
    public void bothEndInSilenceSoTheLastNoteIsNotCutOff() {
        for (boolean classic : new boolean[] {false, true}) {
            short[] s = RestTone.render(classic);
            double secs = s.length / (double) RestTone.RATE;
            assertEquals(0, peak(s, secs - RestTone.TAIL_SEC + 0.01, secs));
        }
    }

    @Test
    public void neverClips() {
        for (boolean classic : new boolean[] {false, true}) {
            for (short v : RestTone.render(classic)) assertTrue(Math.abs(v) <= 32767);
        }
        assertTrue(peak(RestTone.renderChime(), 0, 1) < 32767);
    }
}
