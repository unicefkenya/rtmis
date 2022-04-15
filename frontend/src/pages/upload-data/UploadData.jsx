import React, { useState, useEffect } from "react";
import "./style.scss";
import {
  Row,
  Col,
  Card,
  Divider,
  Checkbox,
  Button,
  Space,
  Select,
  Upload,
} from "antd";
import { FileTextFilled } from "@ant-design/icons";
import { Breadcrumbs } from "../../components";
import { AdministrationDropdown } from "../../components";
import { useNavigate } from "react-router-dom";
import { api, store } from "../../lib";
import { useNotification } from "../../util/hooks";
import { snakeCase, takeRight } from "lodash";
import moment from "moment";

const allowedFiles = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const { Option } = Select;
const { Dragger } = Upload;
const regExpFilename = /filename="(?<filename>.*)"/;
const pagePath = [
  {
    title: "Control Center",
    link: "/control-center",
  },
  {
    title: "Data Upload",
  },
];

const UploadData = () => {
  const { forms, user, administration } = store.useState((state) => state);
  const [formId, setFormId] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const { notify } = useNotification();
  const navigate = useNavigate();
  const exportGenerate = () => {
    api
      .get(`download/generate?form_id=${formId}`)
      .then(() => {
        notify({
          type: "success",
          message: `Data exported successfully`,
        });
        setLoading(false);
        navigate("/data/export");
      })
      .catch(() => {
        notify({
          type: "error",
          message: "Data export failed",
        });
        setLoading(false);
      });
  };

  const selectedAdministration = takeRight(administration, 1)[0]?.name;

  useEffect(() => {
    if (formId && selectedAdministration && user) {
      const date = moment().format("YYYYMMDD");
      setFileName(
        [date, formId, selectedAdministration, snakeCase(user.name)].join("-")
      );
    }
  }, [user, selectedAdministration, formId]);

  const onChange = (info) => {
    if (info.file?.status === "done") {
      notify({
        type: "success",
        message: "File uploaded successfully",
      });
      setUploading(false);
      navigate("/profile");
    } else if (info.file?.status === "error") {
      notify({
        type: "error",
        message: `Could not upload file`,
      });
      setUploading(false);
    }
  };

  const uploadRequest = ({ file, onSuccess }) => {
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    api
      .post(`upload/excel/${formId}`, formData)
      .then((res) => {
        onSuccess(res.data);
      })
      .catch(() => {
        notify({
          type: "error",
          message: "Could not upload file",
        });
        setUploading(false);
      });
  };

  const props = {
    name: fileName,
    multiple: false,
    maxCount: 1,
    showUploadList: false,
    accept: allowedFiles.join(","),
    disabled: !fileName || uploading,
    customRequest: uploadRequest,
    onChange: onChange,
  };

  const handleChange = (e) => {
    setFormId(e);
  };

  const downloadTemplate = () => {
    setLoading(true);
    if (updateExisting) {
      exportGenerate();
    } else {
      api
        .get(`export/form/${formId}`, { responseType: "blob" })
        .then((res) => {
          const contentDispositionHeader = res.headers["content-disposition"];
          const filename = regExpFilename.exec(contentDispositionHeader)?.groups
            ?.filename;
          if (filename) {
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            setLoading(false);
          } else {
            notify({
              type: "error",
              message: "Could not fetch template",
            });
            setLoading(false);
          }
        })
        .catch((e) => {
          console.error(e);
          notify({
            type: "error",
            message: "Could not fetch template",
          });
          setLoading(false);
        });
    }
  };

  return (
    <div id="uploadData">
      <Row justify="space-between">
        <Col>
          <Breadcrumbs pagePath={pagePath} />
        </Col>
      </Row>
      <Divider />
      <Row align="middle">
        <Checkbox
          id="updateExisting"
          checked={updateExisting}
          onChange={() => {
            setUpdateExisting(!updateExisting);
          }}
        >
          Update Existing Data
        </Checkbox>
      </Row>
      <Card
        style={{ padding: 0, minHeight: "40vh" }}
        bodyStyle={{ padding: 0 }}
      >
        <Space align="center" size={32}>
          <img src="/assets/data-download.svg" />
          <p>If you do not already have a template please download it</p>
          <Select placeholder="Select Form..." onChange={handleChange}>
            {forms.map((f, fI) => (
              <Option key={fI} value={f.id}>
                {f.name}
              </Option>
            ))}
          </Select>
          <Button loading={loading} type="primary" onClick={downloadTemplate}>
            Download
          </Button>
        </Space>
        <Space align="center" size={32}>
          <img src="/assets/data-upload.svg" />
          <p>Upload your data</p>
          <Select
            placeholder="Select Form..."
            value={formId}
            onChange={handleChange}
          >
            {forms.map((f, fI) => (
              <Option key={fI} value={f.id}>
                {f.name}
              </Option>
            ))}
          </Select>
          <AdministrationDropdown />
        </Space>
        <div className="upload-wrap">
          <Dragger {...props}>
            <p className="ant-upload-drag-icon">
              <FileTextFilled style={{ color: "#707070" }} />
            </p>
            <p className="ant-upload-text">
              {formId
                ? uploading
                  ? "Uploading.."
                  : "Drop your file here"
                : "Please select a form"}
            </p>
            <Button disabled={!formId} loading={uploading}>
              Browse your computer
            </Button>
          </Dragger>
        </div>
      </Card>
    </div>
  );
};

export default React.memo(UploadData);