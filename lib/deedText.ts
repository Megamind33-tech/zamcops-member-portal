// The ZAMCOPS Deed of Assignment (including Mechanical rights) — legal text
// transcribed verbatim from the official document. Rendered in the member's
// deed-execution step and in the generated PDF; merge fields (date, assignor
// name) are filled at render time.

export const DEED_TITLE = "DEED OF ASSIGNMENT";

// Opening recital. "{{DATE}}" and "{{ASSIGNOR}}" are replaced at render time.
export const DEED_RECITAL = [
  "By this DEED OF ASSIGNMENT made on {{DATE}}",
  "between",
  "{{ASSIGNOR}}",
  "(hereinafter referred to as “the Assignor”) being a member of the Zambia Music Copyright Protection Society",
  "and the said",
  "ZAMBIA MUSIC COPYRIGHT PROTECTION SOCIETY (limited by Guarantee)",
  "with its registered office at 3rd Floor, Anchor House, Cairo Road, Lusaka (hereinafter referred to as “the Society”).",
  "The parties agree as follows:",
];

export interface DeedClause {
  heading?: string; // e.g. "1." — printed bold before the body
  body: string;
  indent?: boolean; // sub-paragraphs (a)–(h), (i)–(iv)
}

export const DEED_CLAUSES: DeedClause[] = [
  { heading: "1.", body: "In this Deed:-" },
  {
    indent: true,
    body:
      "(a) The expression “musical work” shall mean any musical work whether now existing or hereafter composed and such words (if any) as are associated therewith, and shall include (without prejudice to the generality of the expression “musical work”) any song, choral work, the vocal and instrumental music in any cinematograph film, the words and/or music of any monologue having a musical introduction and/or accompaniment, the musical accompaniment of any non-musical play, and any part of such work, words, music or accompaniment as aforesaid.",
  },
  {
    indent: true,
    body:
      "(b) The expression “dramatico-musical work” shall mean an opera, operetta, musical play, revue, pantomime or sketch, in so far as it consists of words and music written expressly therefor, but shall not include a cinematograph film.",
  },
  {
    indent: true,
    body:
      "(c) The word “ballet” shall mean a choreographic work having a story, plot or abstract idea, devised or used for the purpose of interpretation by dancing and/or miming, but shall not include country or folk dancing, nor tap dancing, nor precision dance sequences.",
  },
  {
    indent: true,
    body:
      "(d) The expression “performing right” shall mean and include, subject to the exceptions set out below, the right of performing in public, broadcasting and causing to be transmitted to the subscribers to a diffusion service, in all parts of the world, by any means and in any manner whatsoever, all musical works, and the right of authorising any of the said acts; but unless the following or any of them are expressly authorised, shall not include the right of performing in public, broadcasting, causing to be transmitted to subscribers to a diffusion service or of authorising any of the said acts, any of the following classes of works unless such acts are done by means of cinematograph films: (i) dramatico-musical works in their entirety; (ii) excerpts from dramatico-musical works consisting of a complete act; (iii) excerpts from dramatico-musical works which, not consisting of a complete act, have a total duration exceeding twenty (20) minutes when broadcast by television, or twenty-five (25) minutes when broadcast by sound radio or performed otherwise than by broadcasting, and excerpts which, not consisting of a complete act and not exceeding the durations mentioned in this paragraph, form a consecutive sequence which preserves all the essential elements of the original work and does not interrupt the dramatic action; (iv) the music and any words associated therewith composed or used for a ballet, if accompanied by a visual representation of such ballet exceeding fifteen (15) minutes in total duration or fifty per cent (50%) of the total length of the ballet.",
  },
  {
    indent: true,
    body:
      "(e) The word “performance” shall include, unless otherwise stated, any mode of acoustic presentation, including any such presentation by means of broadcasting or the causing of a work to be transmitted to subscribers to a diffusion service or by the exhibition of a cinematograph film, or by the use of a record or tape, or by any other means, and references to “performing” shall be construed accordingly.",
  },
  {
    indent: true,
    body:
      "(f) The expression “diffusion service” shall mean a telecommunication service of transmissions consisting of sounds, images, signs or signals, which takes place over wires or other paths provided by material substance and is intended for reception by specific members of the public.",
  },
  {
    indent: true,
    body:
      "(g) The expression “synchronising right” in respect of a musical work composed or written primarily for inclusion in the soundtrack of a specific cinematograph film or films, adverts, the production of which was contemplated at the time of the commissioning of the musical work, shall mean the right to reproduce such musical work, or authorise the reproduction thereof in all parts of the world on the soundtrack of a cinematograph film or films; and the expression “film synchronising” shall have a corresponding meaning.",
  },
  {
    indent: true,
    body:
      "(h) The expression “mechanical right” shall mean in respect of any musical work the right to make or cause to be made in all parts of the world a record or records embodying the musical work, and the right to authorise such act.",
  },
  {
    indent: true,
    body:
      "(i) The word “record” shall mean any disc, perforated roll or device in or on which sounds, or data or signals representing sounds, are embodied or represented so as to be capable of being automatically reproduced or performed therefrom.",
  },
  {
    heading: "2.",
    body:
      "The Assignor hereby assigns to the Society All Performing Rights, Synchronising Rights and Mechanical Rights which now belong to or shall hereafter be acquired by or be or become vested in the Assignor during the continuance of the Assignor's membership of the Society, and all such parts or shares (whether limited as to time, place, mode of enjoyment or otherwise) of, and all such interests in, any performing right as so belong to or shall be acquired by or be or become vested in the Assignor (all which premises hereby assigned or expressed or intended to be assigned are hereinafter collectively referred to as “the rights assigned”), TO HOLD the same unto the Society for its exclusive benefit during the residue of the terms for which the rights assigned shall respectively subsist, or during such time as (in accordance with the provisions of the Articles of the Society for the time being in force) the rights remain vested in or controlled by the Society.",
  },
  {
    heading: "3.",
    body:
      "The Society will from time to time pay the Assignor such sums of money out of the monies collected by the Society in respect of the public performance of the works of its members as the Assignor shall be entitled to receive in accordance with the Rules of the Society for the time being in force.",
  },
  {
    heading: "4.",
    body:
      "The Assignor hereby Warrants that the Assignor has good right and full power to assign the rights assigned in the manner aforesaid to the Society, and that the Assignor will at all times hereafter keep the Society harmless and indemnified against all loss, damage, costs, charges and expenses which the Society may suffer or incur in respect of the exercise by the Society of any of the rights assigned which are hereby assigned or purported to be assigned, and that the Assignor shall and will so long as the Assignor shall continue to be a member of the Society do, execute and make all such acts, deeds, powers of attorney, assignments, and assurances for the further, better or more satisfactory assigning or assuring to or vesting in the Society or enabling the Society to enforce the rights assigned or any part thereof, as the Society may from time to time reasonably require.",
  },
];
