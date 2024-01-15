import React, { useEffect, useMemo, useState } from "react";
import SubmissionEditing from "./SubmissionEditing";
import { api, store, uiText } from "../../lib";
import { isEqual, flatten } from "lodash";
import { useNotification } from "../../util/hooks";

const BatchDetail = ({ expanded, setReload, deleting, handleDelete }) => {
  const [dataLoading, setDataLoading] = useState(null);
  const [saving, setSaving] = useState(null);
  const [rawValue, setRawValue] = useState(null);
  const { notify } = useNotification();
  const language = store.useState((s) => s.language);
  const { active: activeLang } = language;

  const text = useMemo(() => {
    return uiText[activeLang];
  }, [activeLang]);

  const questionGroups = window.forms.find((f) => f.id === expanded.form)
    ?.content?.question_group;

  useEffect(() => {
    if (questionGroups) {
      setDataLoading(expanded.id);
      api
        .get(`pending-data/${expanded.id}`)
        .then((res) => {
          const data = questionGroups.map((qg) => {
            return {
              ...qg,
              question: qg.question
                .filter((item) => !item.displayOnly)
                .map((q) => {
                  const findValue = res.data.find(
                    (d) => d.question === q.id
                  )?.value;
                  return {
                    ...q,
                    value: findValue || findValue === 0 ? findValue : null,
                    history:
                      res.data.find((d) => d.question === q.id)?.history ||
                      false,
                  };
                }),
            };
          });
          setRawValue({ ...expanded, data, loading: false });
        })
        .catch((e) => {
          console.error(e);
          setRawValue({ ...expanded, data: [], loading: false });
        })
        .finally(() => {
          setDataLoading(null);
        });
    }
  }, [expanded, questionGroups]);

  const handleSave = (data) => {
    setSaving(data.id);
    const formData = [];
    data.data.map((rd) => {
      rd.question.map((rq) => {
        if (
          (rq.newValue || rq.newValue === 0) &&
          !isEqual(rq.value, rq.newValue)
        ) {
          let value = rq.newValue;
          if (rq.type === "number") {
            value =
              parseFloat(value) % 1 !== 0 ? parseFloat(value) : parseInt(value);
          }
          formData.push({
            question: rq.id,
            value: value,
          });
        }
      });
    });
    api
      .put(
        `form-pending-data/${expanded.form}?pending_data_id=${data.id}`,
        formData
      )
      .then(() => {
        setReload(data.id);
        notify({
          type: "success",
          message: text.successDataUpdated,
        });
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        setSaving(null);
      });
  };

  const updateCell = (key, parentId, value) => {
    let hasEdits = false;
    const data = rawValue.data.map((rd) => ({
      ...rd,
      question: rd.question.map((rq) => {
        if (rq.id === key && expanded.id === parentId) {
          if (isEqual(rq.value, value) && (rq.newValue || rq.newValue === 0)) {
            delete rq.newValue;
          } else {
            rq.newValue = value;
          }
          const edited = !isEqual(rq.value, value);
          if (edited && !hasEdits) {
            hasEdits = true;
          }
          return rq;
        }
        if (
          (rq.newValue || rq.newValue === 0) &&
          !isEqual(rq.value, rq.newValue) &&
          !hasEdits
        ) {
          hasEdits = true;
        }
        return rq;
      }),
    }));
    setRawValue({
      ...rawValue,
      data,
      edited: hasEdits,
    });
  };

  const resetCell = (key, parentId) => {
    const prev = JSON.parse(JSON.stringify(rawValue));
    let hasEdits = false;
    const data = prev.data.map((rd) => ({
      ...rd,
      question: rd.question.map((rq) => {
        if (rq.id === key && expanded.id === parentId) {
          delete rq.newValue;
          return rq;
        }
        if (
          (rq.newValue || rq.newValue === 0) &&
          !isEqual(rq.value, rq.newValue) &&
          !hasEdits
        ) {
          hasEdits = true;
        }
        return rq;
      }),
    }));
    setRawValue({
      ...prev,
      data,
      edited: hasEdits,
    });
  };

  const isEdited = () => {
    return (
      !!flatten(rawValue?.data?.map((g) => g.question))?.filter(
        (d) => (d.newValue || d.newValue === 0) && !isEqual(d.value, d.newValue)
      )?.length || false
    );
  };

  if (!rawValue) {
    return <div>{text.loadingText}</div>;
  }

  return (
    <SubmissionEditing
      expanded={rawValue}
      updateCell={updateCell}
      resetCell={resetCell}
      handleSave={handleSave}
      handleDelete={handleDelete}
      saving={saving}
      dataLoading={dataLoading}
      isEdited={isEdited}
      isEditable={true}
      deleting={deleting}
    />
  );
};

export default BatchDetail;